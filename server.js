const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const elements = JSON.parse(fs.readFileSync(path.join(__dirname,'data/elements.json'),'utf8'));
const interactions = JSON.parse(fs.readFileSync(path.join(__dirname,'data/interactions.json'),'utf8'));
const byId = Object.fromEntries(elements.map(e=>[e.id,e]));
const rooms = new Map();

app.use(express.static(path.join(__dirname,'public')));
app.get('/data/elements.json',(req,res)=>res.json(elements));
app.get('/data/interactions.json',(req,res)=>res.json(interactions));
app.get('/data/aliases.json',(req,res)=>res.json(JSON.parse(fs.readFileSync(path.join(__dirname,'data/aliases.json'),'utf8'))));

function newCode(){
  let code;
  do code=crypto.randomBytes(3).toString('hex').toUpperCase(); while(rooms.has(code));
  return code;
}
function result(a,b){
  if(a===b)return 'tie';
  if(byId[a].wins.includes(b))return 'win';
  return 'loss';
}
function broadcastRoom(room,event,payload){for(const id of room.players)io.to(id).emit(event,payload)}
function sanitizeName(v){return String(v||'Jogador').replace(/[<>]/g,'').trim().slice(0,18)||'Jogador'}

io.on('connection',socket=>{
  socket.on('create_room',({name,limit=2,player={}}={})=>{
    const code=newCode();
    const room={code,name:sanitizeName(name)||'Arena Elemental',limit:2,players:[],choices:new Map(),lives:new Map(),round:0};
    room.players.push(socket.id);
    room.lives.set(socket.id,3);
    rooms.set(code,room);
    socket.join(code);socket.data.room=code;socket.data.playerName=sanitizeName(player.name);
    socket.emit('room_created',{code,room:{code,name:room.name,limit:room.limit,players:[{name:socket.data.playerName}]}});
  });

  socket.on('join_room',({code,player={}}={})=>{
    const room=rooms.get(String(code||'').toUpperCase());
    if(!room)return socket.emit('error_message',{message:'Sala não encontrada.'});
    if(room.players.length>=room.limit)return socket.emit('error_message',{message:'A sala está cheia.'});
    room.players.push(socket.id);room.lives.set(socket.id,3);
    socket.join(room.code);socket.data.room=room.code;socket.data.playerName=sanitizeName(player.name);
    const payload={code:room.code,name:room.name,limit:room.limit,players:room.players.map(id=>({name:io.sockets.sockets.get(id)?.data.playerName||'Jogador'}))};
    broadcastRoom(room,'room_state',{room:payload});
  });

  socket.on('submit_choice',({room:code,element}={})=>{
    const room=rooms.get(code); if(!room||!room.players.includes(socket.id))return;
    if(!byId[element]||room.choices.has(socket.id))return;
    room.choices.set(socket.id,element);
    if(room.choices.size<room.players.length)return; // choices stay hidden
    const [p1,p2]=room.players;
    const a=room.choices.get(p1),b=room.choices.get(p2);
    const r=result(a,b);
    let delta1=0,delta2=0;
    if(r==='win')delta2=-1; else if(r==='loss')delta1=-1;
    if(r==='tie'){delta1=0;delta2=0}
    const l1=Math.max(0,room.lives.get(p1)+delta1),l2=Math.max(0,room.lives.get(p2)+delta2);
    room.lives.set(p1,l1);room.lives.set(p2,l2);
    const reason=r==='win'?interactions[`${a}>${b}`]:r==='loss'?interactions[`${b}>${a}`]:'Os dois elementos possuem a mesma força nesta rodada.';
    io.to(p1).emit('round_reveal',{me:a,opponent:b,result:r,reason,lives:{me:l1,opponent:l2}});
    io.to(p2).emit('round_reveal',{me:b,opponent:a,result:r==='win'?'loss':r==='loss'?'win':'tie',reason:l1===l2&&r==='tie'?'Os dois elementos possuem a mesma força nesta rodada.':reason,lives:{me:l2,opponent:l1}});
    room.choices.clear();room.round++;
    if(l1===0||l2===0){
      broadcastRoom(room,'match_finished',{winner:l1===0? p2 : l2===0 ? p1 : null});
      rooms.delete(room.code);
    }
  });

  socket.on('disconnect',()=>{
    const code=socket.data.room,room=rooms.get(code);if(!room)return;
    room.players=room.players.filter(id=>id!==socket.id);room.choices.delete(socket.id);room.lives.delete(socket.id);
    if(room.players.length===0)rooms.delete(code);
    else broadcastRoom(room,'opponent_left',{});
  });
});

server.listen(PORT,()=>console.log(`Dynamic Elemental Clash running at http://localhost:${PORT}`));
