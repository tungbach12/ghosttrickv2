using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GhostTrick.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSizeChart : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SizeChartId",
                table: "Products",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "SizeCharts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SizeCharts", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Products_SizeChartId",
                table: "Products",
                column: "SizeChartId");

            migrationBuilder.AddForeignKey(
                name: "FK_Products_SizeCharts_SizeChartId",
                table: "Products",
                column: "SizeChartId",
                principalTable: "SizeCharts",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Products_SizeCharts_SizeChartId",
                table: "Products");

            migrationBuilder.DropTable(
                name: "SizeCharts");

            migrationBuilder.DropIndex(
                name: "IX_Products_SizeChartId",
                table: "Products");

            migrationBuilder.DropColumn(
                name: "SizeChartId",
                table: "Products");
        }
    }
}
