using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GhostTrick.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPublicIdToFeedback : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PublicId",
                table: "Feedbacks",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PublicId",
                table: "Feedbacks");
        }
    }
}
