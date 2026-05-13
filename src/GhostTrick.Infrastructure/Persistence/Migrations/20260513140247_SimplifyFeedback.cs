using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GhostTrick.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SimplifyFeedback : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Feedbacks_FeedbackGroups_FeedbackGroupId",
                table: "Feedbacks");

            migrationBuilder.DropTable(
                name: "FeedbackGroups");

            migrationBuilder.DropIndex(
                name: "IX_Feedbacks_FeedbackGroupId",
                table: "Feedbacks");

            migrationBuilder.DropColumn(
                name: "FeedbackGroupId",
                table: "Feedbacks");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "FeedbackGroupId",
                table: "Feedbacks",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "FeedbackGroups",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    LayoutType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Subtitle = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FeedbackGroups", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Feedbacks_FeedbackGroupId",
                table: "Feedbacks",
                column: "FeedbackGroupId");

            migrationBuilder.AddForeignKey(
                name: "FK_Feedbacks_FeedbackGroups_FeedbackGroupId",
                table: "Feedbacks",
                column: "FeedbackGroupId",
                principalTable: "FeedbackGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
