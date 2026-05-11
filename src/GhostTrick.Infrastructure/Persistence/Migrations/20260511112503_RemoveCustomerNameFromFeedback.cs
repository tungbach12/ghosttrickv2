using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GhostTrick.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveCustomerNameFromFeedback : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CustomerName",
                table: "Feedbacks");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CustomerName",
                table: "Feedbacks",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
