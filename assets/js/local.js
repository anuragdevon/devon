// //<== Canvas ==>
// function init(elementid){
//   let canvas = document.getElementById(elementid),
//       p = canvas.getContext("2d"),
//       // w = (canvas.width = window.innerWidth),
//       w = (canvas.width = window.innerWidth),
//       h = (canvas.height = window.innerWidth);
//       // h = (canvas.height = window.innerHeight);
//       // console.log(w, h);
//   p.fillStyle = "rgba(0, 0, 0, 1)";
//   p.fillRect(0, 0, w, h);
// //   console.log(p);
//   initvalue = [p, w, h];
//   return initvalue;
// }
// // initializing the canvas
// let pr = init("dotta");
// let p = pr[0];
// let w = pr[1];
// let h = pr[2];
// // console.log(p, w, h);
// class stars{
//   constructor(){
//       this.x = Math.random()*w;
//         //   console.log("this is x",this.x);
//       this.y = Math.random()*h;
//         //   console.log("this is y",this.y);
//       this.intensity= Math.random()*2;
//         //   console.log("this is d",this.intensity);
//       this.angle = Math.random()*2*Math.PI;
//         //   console.log("this is a",this.angle);
//       this.velocity = ((this.intensity)^2)/4;
//         //   console.log("this is v",this.velocity);

//   }
//   move(){
//       this.x += this.velocity*Math.cos(this.angle);
//       this.y += this.velocity*Math.sin(this.angle);
//       this.angle += Math.random()*20*Math.PI/180-10*Math.PI/180;
//     //   console.log(this.x, this.y, this.angle);
//   }
//   show(){
//       p.beginPath();
//     //   console.log(p.beginPath());
//       p.arc(this.x, this.y, this.intensity, 0, 2*Math.PI);
//     //   console.log(p.arc(this.x, this.y, this.intensity, 0, 2*Math.PI));
//       p.fillStyle = "#149ddd";
//       p.fill();
//   }
// } 

// // array of stars
// let s = []
// function display() {
//   if(s.length <50){
//       s.push(new stars());
//   }
//   // move and show
//   for(var i = 0; i < s.length; ++i){
//       s[i].move();
//       s[i].show();
//       if(s[i].x < 0 || s[i].x > w ||  s[i].y < 0 || s[i].y > h ){
//           s.splice(i, 1);
//       }
//   }
// }
// function animations(){
//   window.requestAnimationFrame;
//   p.clearRect(0,0,w,h);
//   display();
// }
// animations();
// setInterval(animations, 100);


//<== contact form ==>
function openForm() {
    document.getElementById("myForm").style.display = "block";
  }
  
  function closeForm() {
    document.getElementById("myForm").style.display = "none";
  }
  
  // contact button
  var mybutton = document.getElementById("mybtn");
  // When the user scrolls down 20px from the top of the document, show the button
  window.onscroll = function() {scrollFunction()};
  
  
  //<== Navbar shrink and Contact Button ==>
  function scrollFunction() {
    if (document.body.scrollTop > 80 || document.documentElement.scrollTop > 80) {
      document.getElementById("navbar").style.padding = "0rem 0rem";
      // document.getElementById("logo").style.fontSize = "25px";
    } else {
      document.getElementById("navbar").style.padding = "0.3rem 0rem";
      // document.getElementById("logo").style.fontSize = "35px";
    }
  
    if (document.body.scrollTop > 400 || document.documentElement.scrollTop > 400) {
      // mybutton.style.display = "block";
      mybutton.style.bottom = "-4px"
    } else {
      // mybutton.style.display = "none";
      mybutton.style.bottom = "-40px"
    }
  }
  