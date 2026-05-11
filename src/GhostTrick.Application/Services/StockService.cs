using GhostTrick.Application.Interfaces;
using GhostTrick.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace GhostTrick.Application.Services
{
    public class StockService : IStockService
    {
        private readonly IGenericRepository<ProductVariant> _variantRepo;
        private readonly IGenericRepository<InventoryTransaction> _transactionRepo;
        private readonly IGenericRepository<OrderItem> _orderItemRepo;
        private readonly IUnitOfWork _uow;

        public StockService(
            IGenericRepository<ProductVariant> variantRepo,
            IGenericRepository<InventoryTransaction> transactionRepo,
            IGenericRepository<OrderItem> orderItemRepo,
            IUnitOfWork uow)
        {
            _variantRepo = variantRepo;
            _transactionRepo = transactionRepo;
            _orderItemRepo = orderItemRepo;
            _uow = uow;
        }

        public async Task<bool> CheckStockAsync(int variantId, int quantity)
        {
            var variant = await _variantRepo.GetByIdAsync(variantId);
            return variant != null && variant.Stock >= quantity;
        }

        /// <summary>
        /// Checks stock for all items in batch. Returns dict of variantId -> isAvailable.
        /// </summary>
        public async Task<Dictionary<int, bool>> CheckStockBatchAsync(IEnumerable<(int variantId, int quantity)> items)
        {
            var itemList = items.ToList();
            var variantIds = itemList.Select(i => i.variantId).ToList();

            var variantsResults = await _variantRepo.FindAsync(v => variantIds.Contains(v.Id));
            var variants = variantsResults.ToDictionary(v => v.Id, v => v.Stock);

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

            try
            {
                var variants = await _variantRepo.FindAsync(v => variantIds.Contains(v.Id));

                foreach (var item in itemList)
                {
                    var variant = variants.FirstOrDefault(v => v.Id == item.variantId)
                        ?? throw new InvalidOperationException($"Biến thể sản phẩm {item.variantId} không tồn tại.");

                    if (variant.Stock < item.quantity)
                        throw new InvalidOperationException(
                            $"Sản phẩm '{variant.Size}/{variant.Color}' chỉ còn {variant.Stock} sản phẩm.");

                    variant.Stock -= item.quantity;
                    _variantRepo.Update(variant);

                    await _transactionRepo.AddAsync(new InventoryTransaction
                    {
                        VariantId = variant.Id,
                        Quantity = -item.quantity,
                        Type = InventoryTransactionType.Sale,
                        ReferenceId = referenceId,
                        Note = $"Xuất kho bán hàng - Đơn hàng {referenceId}"
                    });
                }

                await _uow.CompleteAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                throw new InvalidOperationException("Hệ thống đang bận do có nhiều người cùng đặt hàng. Vui lòng thử lại sau giây lát.");
            }
        }

        public async Task RestoreStockAsync(int orderId)
        {
            var orderItems = await _orderItemRepo.FindAsync(
                oi => oi.OrderId == orderId,
                q => q.Include(oi => oi.Variant!)
            );

            foreach (var item in orderItems)
            {
                if (item.Variant != null)
                {
                    item.Variant.Stock += item.Quantity;
                    _variantRepo.Update(item.Variant);

                    await _transactionRepo.AddAsync(new InventoryTransaction
                    {
                        VariantId = item.VariantId,
                        Quantity = item.Quantity,
                        Type = InventoryTransactionType.Return,
                        ReferenceId = orderId.ToString(),
                        Note = $"Hoàn kho - Hủy đơn hàng {orderId}"
                    });
                }
            }

            await _uow.CompleteAsync();
        }
    }
}
