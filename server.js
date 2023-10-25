const express=require('express');
const app=express();
const http=require('http');
const {Server}=require('socket.io');
const {isRoomIdPresent,createRoom,updateRoom,getCode,connectToDatabase}=require('./database');
const server=http.createServer(app);
const io=new Server(server);

// app.use(express.static('build'));
// app.use((req,res)=>{
//     res.sendFile(__dirname+'/build/index.html');
// });
const userSocketMap={};//at runtime
connectToDatabase();

const cron = require('node-cron');

function myCronJob() {
  // Your cron job logic goes here
  console.log('Running cron job...');
}

cron.schedule('* * * * *', myCronJob);

function getClients(roomID) {
   return Array.from(io.sockets.adapter.rooms.get(roomID)||[]).map(
    (socketId)=>{
        return {
            socketId,
            username:userSocketMap[socketId],
        }
   });
}
io.on('connection',(socket)=>{

    socket.on('join',({roomId,username,mode})=>{
         userSocketMap[socket.id]=username;
         socket.join(roomId);
         console.log(`${username} joined the room ${roomId}`);
         const clients=getClients(roomId);
         clients.forEach(({socketId})=>{
            io.to(socketId).emit('joined',{
                clients,
                username,
                socketId:socket.id,
            });
         });

    });

    socket.on('read',async ({roomId})=>{
        try{
            const code=await getCode(roomId)||' ';
            //emit code to the socket
            io.to(socket.id).emit('write',{
                code,
            });
        }
        catch(err)
        {
            console.error('Error fetching from database:', err);
        }
    });

    socket.on('code-change',async ({roomId,code})=>{
        
        try {
            if(await isRoomIdPresent(roomId))
            {
                console.log('updating room');
                await updateRoom(roomId,code);
            }
            else 
            {
                console.log('creating room');
                await createRoom(roomId,code);
            }
          } catch (error) {
            console.error('Error updating database:', error);
          }
          const clients=getClients(roomId);
            clients.forEach(({socketId})=>{
            if(socketId!==socket.id)
            {io.to(socketId).emit('code-change',{
                code,
            });}
        })

        
    });

    socket.on('sync-code',async ({roomId,socketId})=>{

        try{
          
            const code=await getCode(roomId)||' ';
          
            io.to(socketId).emit('code-change',{
                code,
            });
        }
        catch(err)
        {
            console.error('Error fetching from database:', err);
        }
    
       
    });

    socket.on('disconnecting',()=>{
        const rooms=[...socket.rooms];
        rooms.forEach((roomId)=>{
            socket.in(roomId).emit('disconnected',{
                socketId:socket.id,
                username:userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    })
});



  
const PORT=process.env.PORT || 5000;
server.listen(PORT,()=>console.log(`Server running on port ${PORT}`));
