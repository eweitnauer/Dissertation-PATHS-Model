d3 example:

```
console.log(d3.xhr('http://localhost:3000/pi').header("Content-Type", "application/json").post(JSON.stringify({d3: 'yes'}), function(error, data){
    console.log(error);
    console.log(data);
}));
```
