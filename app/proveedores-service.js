const { Kafka } = require('kafkajs');
const { v4: uuidv4 } = require('uuid');

// Configuración de Kafka
const kafka = new Kafka({
  clientId: 'proveedores-service',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'proveedores-group' });
const producer = kafka.producer();

// Simulación de base de datos de proveedores
const proveedoresDB = {
  'proveedor-A': { stock: 100 },
  'proveedor-B': { stock: 150 }
};

async function run() {
  // Conectar el consumidor y productor
  await consumer.connect();
  await producer.connect();
  
  // Suscribirse al topic PedidoCreado
  await consumer.subscribe({ topic: 'PedidoCreado', fromBeginning: true });

  // Procesar mensajes
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      if (topic === 'PedidoCreado') {
        const pedido = JSON.parse(message.value.toString());
        console.log('Procesando reserva de stock para pedido:', pedido.id);
        
        // Simular reserva de stock (elegir proveedor aleatorio)
        const proveedor = Math.random() > 0.5 ? 'proveedor-A' : 'proveedor-B';
        const cantidadProductos = pedido.productos.length;
        
        if (proveedoresDB[proveedor].stock >= cantidadProductos) {
          proveedoresDB[proveedor].stock -= cantidadProductos;
          
          const evento = {
            pedidoId: pedido.id,
            proveedor,
            cantidad: cantidadProductos,
            reservaId: uuidv4(),
            fecha: new Date().toISOString()
          };
          
          // Publicar evento StockReservado
          await producer.send({
            topic: 'StockReservado',
            messages: [
              { value: JSON.stringify(evento) }
            ]
          });
          
          console.log('Stock reservado exitosamente:', evento);
        } else {
          // Publicar evento StockInsuficiente
          await producer.send({
            topic: 'StockInsuficiente',
            messages: [
              { 
                value: JSON.stringify({
                  pedidoId: pedido.id,
                  proveedor,
                  mensaje: 'Stock insuficiente'
                }) 
              }
            ]
          });
          
          console.log('Stock insuficiente para pedido:', pedido.id);
        }
      }
    }
  });
}

run().catch(console.error);