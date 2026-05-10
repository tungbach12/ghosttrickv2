using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.Application.Services
{
    public class StockService : IStockService
    {
        private readonly IGhostTrickContext _context;

        public StockService(IGhostTrickContext context)
        {
            _context = context;
        }

        public async Task<bool> CheckStockAsync(int variantId, int quantity)
        {
            var variant = await _context.ProductVariants.FindAsync(variantId);
            return variant != null && variant.Stock >= quantity;
        }

        /// <summary>
        /// Checks stock for all items in batch. Returns dict of variantId -> isAvailable.
        /// </summary>
        public async Task<Dictionary<int, bool>> CheckStockBatchAsync(IEnumerable<(int variantId, int quantity)> items)
        {
            var itemList = items.ToList();
            var variantIds = itemList.Select(i => i.variantId).ToList();

            var variants = await _context.ProductVariants
                .Where(v => variantIds.Contains(v.Id))
                .ToDictionaryAsync(v => v.Id, v => v.Stock);

            return itemList.ToDictionary(
                i => i.variantId,
                i => variants.TryGetValue(i.variantId, out var stock) && stock >= i.quantity
            );
        }

        /// <summary>
        /// Atomically deducts stock using a DB transaction.
        /// Throws InvalidOperationException if any item is out of stock.
        /// </summary>
        public async Task DeductStockAsync(IEnumerable<(int variantId, int quantity)> items, string? referenceId = null)
        {
            var itemList = items.ToList();
            var variantIds = itemList.Select(i => i.variantId).ToList();

            // Use existing transaction if provided by caller (e.g. OrdersController), otherwise create new
            var transaction = _context.Database.CurrentTransaction == null 
                ? await _context.Database.BeginTransactionAsync() 
                : null;

            try
            {
                var variants = await _context.ProductVariants
                    .Where(v => variantIds.Contains(v.Id))
                    .ToListAsync();

                foreach (var item in itemList)
                {
                    var variant = variants.FirstOrDefault(v => v.Id == item.variantId)
                        ?? throw new InvalidOperationException($"Biến thể sản phẩm {item.variantId} không tồn tại.");

                    if (variant.Stock < item.quantity)
                        throw new InvalidOperationException(
                            $"Sản phẩm '{variant.Size}/{variant.Color}' chỉ còn {variant.Stock} sản phẩm.");

                    variant.Stock -= item.quantity;

                    // Log transaction
                    _context.InventoryTransactions.Add(new InventoryTransaction
                    {
                        VariantId = variant.Id,
                        Quantity = -item.quantity,
                        Type = InventoryTransactionType.Sale,
                        ReferenceId = referenceId,
                        Note = $"Xuất kho bán hàng - Đơn hàng {referenceId}"
                    });
                }

                await _context.SaveChangesAsync();
                
                if (transaction != null) await transaction.CommitAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (transaction != null) await transaction.RollbackAsync();
                throw new InvalidOperationException("Hệ thống đang bận do có nhiều người cùng đặt hàng. Vui lòng thử lại sau giây lát.");
            }
            catch
            {
                if (transaction != null) await transaction.RollbackAsync();
                throw;
            }
            finally
            {
                if (transaction != null) await transaction.DisposeAsync();
            }
        }

        public async Task RestoreStockAsync(int orderId)
        {
            var orderItems = await _context.OrderItems
                .Where(oi => oi.OrderId == orderId)
                .Include(oi => oi.Variant)
                .ToListAsync();

            foreach (var item in orderItems)
            {
                if (item.Variant != null)
                {
                    item.Variant.Stock += item.Quantity;

                    // Log transaction
                    _context.InventoryTransactions.Add(new InventoryTransaction
                    {
                        VariantId = item.VariantId,
                        Quantity = item.Quantity,
                        Type = InventoryTransactionType.Return,
                        ReferenceId = orderId.ToString(),
                        Note = $"Hoàn kho - Hủy đơn hàng {orderId}"
                    });
                }
            }

            await _context.SaveChangesAsync();
        }
    }
}
