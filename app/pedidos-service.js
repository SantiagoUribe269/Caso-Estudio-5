const { Kafka } = require('kafkajs');
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(bodyParser.json());

//Configuración de Kafka
const kafka = new Kafka({
  clientId: 'pedidos-service',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();

// "Base de datos" en memoria para el POC
const pedidosDB = new Map();

app.use((req, _, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});


//POST pedido
app.post('/pedidos', async (req, res) => {
  try {
    const pedido = {
      id: uuidv4(),
      clienteId: req.body.clienteId,
      productos: req.body.productos,
      direccionEnvio: req.body.direccionEnvio,
      fechaCreacion: new Date().toISOString(),
      estado: 'CREADO'
    };

    //Validation
    if (!pedido.clienteId || !pedido.productos || pedido.productos.length === 0) {
      return res.status(400).json({ error: 'Datos del pedido incompletos' });
    }

    // save in DB
    pedidosDB.set(pedido.id, pedido);

    // Publicar evento
    await producer.connect();
    await producer.send({
      topic: 'PedidoCreado',
      messages: [{ value: JSON.stringify(pedido) }]
    });
    await producer.disconnect();

    res.status(201).json({
      mensaje: 'Pedido creado exitosamente',
      pedidoId: pedido.id,
      pedido
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al crear el pedido' });
  }
});

// GET all pedidos
app.get('/pedidos', (_, res) => {
  res.json({
    total: pedidosDB.size,
    pedidos: Array.from(pedidosDB.values())
  });
});

// get pedido by ID
app.get('/pedidos/:id', (req, res) => {
  const pedido = pedidosDB.get(req.params.id);
  if (!pedido) {
    return res.status(404).json({ error: 'Pedido no encontrado' });
  }
  res.json(pedido);
});

// PATCH pedido (solo algunos campos)
app.patch('/pedidos/:id', (req, res) => {
  const pedido = pedidosDB.get(req.params.id);
  if (!pedido) {
    return res.status(404).json({ error: 'Pedido no encontrado' });
  }

  const updates = req.body;
  const camposPermitidos = ['direccionEnvio', 'estado'];
  
  Object.keys(updates).forEach(key => {
    if (camposPermitidos.includes(key)) {
      pedido[key] = updates[key];
    }
  });

  pedido.fechaActualizacion = new Date().toISOString();
  pedidosDB.set(pedido.id, pedido);

  res.json({
    mensaje: 'Pedido actualizado',
    pedido
  });
});

// delete pedido
app.delete('/pedidos/:id', (req, res) => {
  if (!pedidosDB.has(req.params.id)) {
    return res.status(404).json({ error: 'Pedido no encontrado' });
  }
  
  pedidosDB.delete(req.params.id);
  res.json({ mensaje: 'Pedido eliminado' });
});

// start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Pedidos Service corriendo en http://localhost:${PORT}`);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});