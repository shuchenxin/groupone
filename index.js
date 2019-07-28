const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const path = require('path');
const mysql = require('mysql');
const promise = require('es6-promise').Promise;

var xinc = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "19960801scx",
  database: "xinc"
});

xinc.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

var yinc = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "19960801scx",
  database: "yinc"
});

yinc.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

var zinc = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "19960801scx",
  database: "zinc"
});

zinc.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

function getX(sql,n,q) {
    return new Promise((resolve) => {
        xinc.query(sql,[n,q], function(err, result, fields){
            if (err){ 
              throw err;
            }
            resolve(result[0][0].id);
        });
    });
}

function getY(sql,n,q){
    return new Promise((resolve) => {
        yinc.query(sql,[n,q], function(err, result, fields){
            if (err){ 
              throw err;
            }
            resolve(result[0][0].id);
        });
    });
}

function getZ(sql,n,q){
    return new Promise((resolve) => {
        zinc.query(sql,[n,q], function(err, result, fields){
            if (err){ 
              throw err;
            }
            resolve(result[0][0].id);
        });
    });
}

app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
   res.sendFile('OrderApp.html', {
       root: path.join(__dirname, './')
   })
});

app.post('/', (req, res) => {
  var number = req.body.number_of_input;
  var ordered = req.body.company_of_order;
  var order_t = "";
  var p_xinc = [];
  var q_xinc = [];
  var p_yinc = [];
  var q_yinc = [];
  var p_zinc = [];
  var q_zinc = [];
  
  for(var i=0;i<number;i++){
    var p = 'pNo'+i.toString();
    var q = 'qty'+i.toString();
    var c = 'company'+i.toString();
    var pNo = req.body[p];
    var qty = req.body[q];
    var company = req.body[c];
    var sql_update = 'call update_qty(?,?)';
    var sql_order = 'insert into order_record (order_type,p_name,quantity) values (?,?,?)';
    if(company=='Xinc'){
      p_xinc.push(pNo);
      q_xinc.push(qty);
    }
    if(company=='Yinc'){
      p_yinc.push(pNo);
      q_yinc.push(qty);
    }
    if(company=='Zinc'){
      p_zinc.push(pNo);
      q_zinc.push(qty);
    }
    if(ordered=='Xinc'){
      p_xinc.push(pNo);
      q_xinc.push(-qty);
    }
    if(ordered=='Yinc'){
      p_yinc.push(pNo);
      q_yinc.push(-qty);
    }
    if(ordered=='Zinc'){
      p_zinc.push(pNo);
      q_zinc.push(-qty);
    }
  }
    let promises = [];
    xinc.beginTransaction(function(err) { if (err) { throw err; } });
    for(var i=0;i<p_xinc.length;i++){
      n=p_xinc[i];
      q=q_xinc[i];
      if(q>0){
        order_t="sell";
      } else{
        order_t="buy";
      }
      promises.push(getX(sql_update,n,q));
      if(q<0){
        q=-q;
      }
      xinc.query(sql_order,[order_t,n,q], function(err, result, fields){
        if (err) throw err;
      });
    }

    yinc.beginTransaction(function(err) { if (err) { throw err; } });
    for(var i=0;i<p_yinc.length;i++){
      n=p_yinc[i];
      q=q_yinc[i];
      if(q>0){
        order_t="sell";
      } else{
        order_t="buy";
      }
      promises.push(getY(sql_update,n,q));
      if(q<0){
        q=-q;
      }
      yinc.query(sql_order,[order_t,n,q], function(err, result, fields){
        if (err) throw err;
      });
    }
  

    zinc.beginTransaction(function(err) { if (err) { throw err; } });
    for(var i=0;i<p_zinc.length;i++){
      n=p_zinc[i];
      q=q_zinc[i];
      if(q>0){
        order_t="sell";
      } else{
        order_t="buy";
      }
      promises.push(getZ(sql_update,n,q));
      if(q<0){
        q=-q;
      }
      zinc.query(sql_order,[order_t,n,q], function(err, result, fields){
        if (err) throw err;
      });
    }

    Promise.all(promises)
      .then((results) => {
        console.log(results);
        var transactionSuccessful=true;
        for(var i=0;i<results.length;i++){
          if (results[i]==1){
            transactionSuccessful=false;
          }
        }
        if(transactionSuccessful==false){
          xinc.rollback();yinc.rollback();zinc.rollback();
          res.send(
          `<div style="margin-left:15px; margin-top:15px">
          <h4>Order unsuccessful. Insufficient quantities in stock.</h4>
          <input type="button" value="Return to Order" onclick="window.location='/';">
          </div>`);}
        else{
          xinc.commit(function(err) { console.log('Xinc Transaction Complete.');});
          yinc.commit(function(err) { console.log('Yinc Transaction Complete.');});
          zinc.commit(function(err) { console.log('Zinc Transaction Complete.');});
          res.send(
          `<div style="margin-left:15px; margin-top:15px">
          <h4>Order was successfully made.</h4>
          <input type="button" value="Return to Order" onclick="window.location='/';">
          </div>`);}
      })
      .catch((e) => {});

});

app.listen(3000, function () {
   console.log('OrderApp listening on port 3000');
});



