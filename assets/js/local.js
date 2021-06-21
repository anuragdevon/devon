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
// <== Homepage visible/opacity ==>
function first() {
  if (document.getElementById("hi") != null) {
    setTimeout(function() {
      document.getElementById('hi').style.opacity = '1';
    }, 0);
  }
}
first();
function second() {
  if (document.getElementById("name") != null) {
    setTimeout(function() {
      document.getElementById('name').style.opacity = '1';
    }, 300);
  }
}
second();
function third() {
  if (document.getElementById("tag") != null) {
    setTimeout(function() {
      document.getElementById('tag').style.opacity = '1';
    }, 1700);
  }
}
third();

// function section() {
//   if (document.getElementsByTagName("section") != null) {
//     setTimeout(function() {
//       document.getElementsByTagName("section").style.opacity = '1';
//     }, 1000);
//   }
// }
// section();