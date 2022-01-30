//<== contact form ==>
function openForm() {
    document.getElementById("myForm").style.display = "block";
  }
  
  function closeForm() {
    document.getElementById("myForm").style.display = "none";
  }
  
  // contact button
  var mybutton = document.getElementById("contact");
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
      // console.log(document.body.scrollTop);
      // console.log(document.documentElement.scrollTop);
      // mybutton.style.display = "block";
      mybutton.style.bottom = "-4px"
    } else {
      // console.log(document.body.scrollTop);
      // console.log(document.documentElement.scrollTop);
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
  
  
  
  // <== cookie consent ==>
  // --- Config --- //
  var purecookieTitle = "Cookies."; // Title
  var purecookieDesc = "By using this website, you automatically accept cookies"; // Description
  var purecookieLink = '<a href="https://developers.google.com/analytics/devguides/collection/analyticsjs/cookie-usage" rel="noopener target="_blank">What for?</a>'; // Cookiepolicy link
  var purecookieButton = "Understood"; // Button text
  // ---        --- //
  
  
  function pureFadeIn(elem, display){
    var el = document.getElementById(elem);
    el.style.opacity = 0;
    el.style.display = display || "block";
  
    (function fade() {
      var val = parseFloat(el.style.opacity);
      if (!((val += .02) > 1)) {
        el.style.opacity = val;
        requestAnimationFrame(fade);
      }
    })();
  };
  function pureFadeOut(elem){
    var el = document.getElementById(elem);
    el.style.opacity = 1;
  
    (function fade() {
      if ((el.style.opacity -= .02) < 0) {
        el.style.display = "none";
      } else {
        requestAnimationFrame(fade);
      }
    })();
  };
  
  function setCookie(name,value,days) {
      var expires = "";
      if (days) {
          var date = new Date();
          date.setTime(date.getTime() + (days*24*60*60*1000));
          expires = "; expires=" + date.toUTCString();
      }
      document.cookie = name + "=" + (value || "")  + expires + "; path=/";
  }
  function getCookie(name) {
      var nameEQ = name + "=";
      var ca = document.cookie.split(';');
      for(var i=0;i < ca.length;i++) {
          var c = ca[i];
          while (c.charAt(0)==' ') c = c.substring(1,c.length);
          if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
      }
      return null;
  }
  function eraseCookie(name) {
      document.cookie = name+'=; Max-Age=-99999999;';
  }
  
  function cookieConsent() {
    if (!getCookie('purecookieDismiss')) {
      document.body.innerHTML += '<div class="cookieConsentContainer" id="cookieConsentContainer"><div class="cookieTitle"><p>' + purecookieTitle + '</p></div><div class="cookieDesc"><p>' + purecookieDesc + ' ' + purecookieLink + '</p></div><div class="cookieButton"><a onClick="purecookieDismiss();">' + purecookieButton + '</a></div></div>';
      pureFadeIn("cookieConsentContainer");
    }
  }
  
  function purecookieDismiss() {
    setCookie('purecookieDismiss','1',7);
    pureFadeOut("cookieConsentContainer");
  }
  
  window.onload = function() { cookieConsent(); };
  

// SMTP SERVER
function sendEmail() {
  var myForm = document.getElementById("contactme");
  sender_email = myForm.elements[0].value;
  sender_message = myForm.elements[1].value;
  console.log(sender_email, sender_message);
	Email.send({
    Host: "smtp.gmail.com",
    Username : "noreplydevon@gmail.com",
    Password : "Something@1234",
    To : 'anuragkar16@gmail.com',
    From : "noreplydevon@gmail.com",
    Subject : "Contact From Website",
    Body : "EmailID: " + sender_email + "<br> MESSAGE: " + sender_message
    }).then(
      alert("Email Sent!")
    );
} 