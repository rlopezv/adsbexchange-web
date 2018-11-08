const express = require('express');
const http = require('http');
const r = require("rethinkdb");

const app = express();
const httpServer = http.createServer(app);
const io = require('socket.io')(httpServer);

app.use(express.static(`${__dirname}/public`));

setInterval(() => {
    io.emit('coords', {
      lat: 37 + Math.random() * 20 - 10,
      lng: -96 + Math.random() * 40 - 20
    });
}, 100);

httpServer.listen(3002, () => {
  console.log('Listening on 0.0.0.0:3002')
});

r.connect({ db: 'data' }).then(function(conn) {
  //r.table('Europe').filter({"OpIcao":"IBE"}).changes().run(conn, function(err, cursor) {
    r.table('Europe').filter({"OpIcao":"IBE"}).changes().run(conn, function(err, cursor) {  
  cursor.each(function(err, item) {
      // if (item.new_val.Lat>35 && item.new_val.Lat<43 && 
      //   item.new_val.Lng>-10 && item.new_val.Lng<4) {
      console.log(item);
      var mapData = {
        lat: item.new_val.Lat,
        lng: item.new_val.Long,
        from: item.new_val.From,
        to: item.new_val.To,
        icao: item.new_val.Icao,
        op: item.new_val.Op,
        time: item.new_val.PostTime

      };
      console.log("->"+JSON.stringify(mapData));
      // io.emit('coords', {
      //   lat: item.new_val.Lat,
      //   lng: item.new_val.Long
      // });
      io.emit('flight_coords', mapData);
  //  }
    });
  });
});