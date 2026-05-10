# Stage 1: Build the application
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj files and restore as distinct layers
COPY ["src/GhostTrick.WebApi/GhostTrick.WebApi.csproj", "src/GhostTrick.WebApi/"]
COPY ["src/GhostTrick.Application/GhostTrick.Application.csproj", "src/GhostTrick.Application/"]
COPY ["src/GhostTrick.Domain/GhostTrick.Domain.csproj", "src/GhostTrick.Domain/"]
COPY ["src/GhostTrick.Infrastructure/GhostTrick.Infrastructure.csproj", "src/GhostTrick.Infrastructure/"]
RUN dotnet restore "src/GhostTrick.WebApi/GhostTrick.WebApi.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/src/src/GhostTrick.WebApi"
RUN dotnet build "GhostTrick.WebApi.csproj" -c Release -o /app/build

# Publish the application
FROM build AS publish
RUN dotnet publish "GhostTrick.WebApi.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Serve the application
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Expose ports
EXPOSE 8080

ENTRYPOINT ["dotnet", "GhostTrick.WebApi.dll"]
