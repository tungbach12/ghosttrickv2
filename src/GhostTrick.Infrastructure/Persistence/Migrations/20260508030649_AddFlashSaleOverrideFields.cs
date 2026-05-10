using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GhostTrick.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFlashSaleOverrideFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "FlashStock",
                table: "SaleEventProducts",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "SaleEventProducts",
                type: "rowversion",
                rowVersion: true,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "SalePrice",
                table: "SaleEventProducts",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "SoldCount",
                table: "SaleEventProducts",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FlashStock",
                table: "SaleEventProducts");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "SaleEventProducts");

            migrationBuilder.DropColumn(
                name: "SalePrice",
                table: "SaleEventProducts");

            migrationBuilder.DropColumn(
                name: "SoldCount",
                table: "SaleEventProducts");
        }
    }
}
