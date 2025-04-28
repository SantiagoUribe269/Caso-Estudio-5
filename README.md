# Caso-Estudio-5
Se implementó un POC del flujo de creación de Pedido + el flujo de Reserva de Stock

## Servicios

1. **Pedidos Service**: Maneja la creación y gestión de pedidos
   - Puerto: 3000
   - Endpoints:
     - `POST /pedidos` - Crear nuevo pedido
     - `GET /pedidos` - Listar todos los pedidos
     - `GET /pedidos/:id` - Obtener pedido específico
     - `PATCH /pedidos/:id` - Actualizar pedido
     - `DELETE /pedidos/:id` - Eliminar pedido

2. **Proveedores Service**: Maneja reservas de stock
   - Puerto: 3001
   - Endpoints:
     - `GET /proveedores` - Listar proveedores
     - `GET /proveedores/:id` - Obtener proveedor específico
     - `PATCH /proveedores/:id/stock` - Actualizar stock
     - `GET /reservas` - Listar reservas
     - `GET /reservas/:id` - Obtener reserva específica

## Requisitos

- Docker (para Kafka)
- Node.js 16+
- npm o yarn

## Instalación y Ejecución

1. **Iniciar Kafka**:
   ```bash
   docker-compose up -d
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Ejecutar servicios** (en terminales separadas):
   ```bash
   node pedidos-service.js
   node proveedores-service.js
   ```

## Flujo de Eventos

1. Cliente crea pedido → Pedidos Service
2. Pedidos Service publica evento `PedidoCreado` en Kafka
3. Proveedores Service consume el evento y:
   - Intenta reservar stock
   - Publica `StockReservado` o `StockInsuficiente`

