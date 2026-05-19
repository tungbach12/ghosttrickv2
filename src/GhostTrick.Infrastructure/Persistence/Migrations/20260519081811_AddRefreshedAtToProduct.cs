using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GhostTrick.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRefreshedAtToProduct : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "RefreshedAt",
                table: "Products",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.Sql("UPDATE Products SET RefreshedAt = CreatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RefreshedAt",
                table: "Products");
        }
    }
}
