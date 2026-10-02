import {currentClass, joinClass} from './class-session.js';
const form=document.getElementById('class-login-form');
const error=document.getElementById('login-error');
const input=document.getElementById('class-code');
if(currentClass())window.location.replace('./');
input.addEventListener('input',()=>{error.hidden=true;input.removeAttribute('aria-invalid');});
form.addEventListener('submit',event=>{
  event.preventDefault();
  try {
    if(joinClass(input.value)) {
      input.value='';
      window.location.replace('./');
      return;
    }
    error.textContent='That code isn’t recognized. Check the code with your instructor and try again.';
    input.setAttribute('aria-invalid','true');
    input.focus();
  } catch {
    error.textContent='Your browser could not remember this class login. Allow session storage for this site and try again.';
  }
  error.hidden=false;
});
