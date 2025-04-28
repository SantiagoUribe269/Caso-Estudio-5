const { Kafka } = require('kafkajs');
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(bodyParser.json());

//Configuración de Kafka
const kafka = new Kafka({
  clientId: 'proveedores-service',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'proveedores-group' });
const producer = kafka.producer();

// "Base de datos" en memoria para el POC
const proveedoresDB = {
  'proveedor-A': { 
    id: 'proveedor-A',
    nombre: 'Proveedor Miami Tech',
    stock: 100,
    productos: ['prod-1', 'prod-2'],
    reservas: []
  },
  'proveedor-B': {
    id: 'proveedor-B',
    nombre: 'Proveedor Florida Electronics',
    stock: 150,
    productos: ['prod-3', 'prod-4'],
    reservas: []
  }
};

// "Base de datos" de reservas
const reservasDB = new Map();

app.use((req, _, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});


// GET ALL proveedores
app.get('/proveedores', (_, res) => {
  res.json(Object.values(proveedoresDB));
});

// GET proveedores by ID
app.get('/proveedores/:id', (req, res) => {
  const proveedor = proveedoresDB[req.params.id];
  if (!proveedor) {
    return res.status(404).json({ error: 'Proveedor no encontrado' });
  }
  res.json(proveedor);
});

// patch stock de proveedor
app.patch('/proveedores/:id/stock', (req, res) => {
  const proveedor = proveedoresDB[req.params.id];
  if (!proveedor) {
    return res.status(404).json({ error: 'Proveedor no encontrado' });
  }

  const { cantidad } = req.body;
  if (typeof cantidad !== 'number') {
    return res.status(400).json({ error: 'Cantidad inválida' });
  }

  proveedor.stock += cantidad;
  res.json({
    mensaje: 'Stock actualizado',
    nuevoStock: proveedor.stock,
    proveedorId: proveedor.id
  });
});

// get all reservas
app.get('/reservas', (_, res) => {
  res.json(Array.from(reservasDB.values()));
});

// get reservas by id
app.get('/reservas/:id', (req, res) => {
  const reserva = reservasDB.get(req.params.id);
  if (!reserva) {
    return res.status(404).json({ error: 'Reserva no encontrada' });
  }
  res.json(reserva);
});

async function runKafkaConsumer() {
  await consumer.connect();
  await producer.connect();
  
  await consumer.subscribe({ topic: 'PedidoCreado', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      if (topic === 'PedidoCreado') {
        const pedido = JSON.parse(message.value.toString());
        console.log('Procesando reserva para pedido:', pedido.id);
        
        const proveedorId = Math.random() > 0.5 ? 'proveedor-A' : 'proveedor-B';
        const proveedor = proveedoresDB[proveedorId];
        const cantidadProductos = pedido.productos.reduce((sum, p) => sum + p.cantidad, 0);
        
        if (proveedor.stock >= cantidadProductos) {
          proveedor.stock -= cantidadProductos;
          
          const reserva = {
            id: uuidv4(),
            pedidoId: pedido.id,
            proveedorId,
            cantidad: cantidadProductos,
            fecha: new Date().toISOString(),
            estado: 'RESERVADO'
          };
          
          proveedor.reservas.push(reserva.id);
          reservasDB.set(reserva.id, reserva);

          await producer.send({
            topic: 'StockReservado',
            messages: [{ value: JSON.stringify(reserva) }]
          });
          
          console.log('Stock reservado:', reserva);
        } else {
          const evento = {
            pedidoId: pedido.id,
            proveedorId,
            mensaje: 'Stock insuficiente',
            fecha: new Date().toISOString()
          };
          
          await producer.send({
            topic: 'StockInsuficiente',
            messages: [{ value: JSON.stringify(evento) }]
          });
          
          console.log('Stock insuficiente para pedido:', pedido.id);
        }
      }
    }
  });
}

// start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Proveedores Service corriendo en http://localhost:${PORT}`);
  runKafkaConsumer().catch(console.error);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});