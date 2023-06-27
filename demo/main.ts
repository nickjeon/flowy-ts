import flowy from '../src/index';

document.addEventListener("DOMContentLoaded", function () {
  let rightcard = false;
  let tempblock: HTMLElement;
  let tempblock2: HTMLElement;
  document.getElementById("blocklist")!.innerHTML =
    '<div class="blockelem create-flowy noselect"><input type="hidden" name="blockelemtype" class="blockelemtype" value="1"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                  <div class="blockico"><span></span><img src="assets/eye.svg"></div><div class="blocktext">                        <p class="blocktitle">New visitor</p><p class="blockdesc">Triggers when somebody visits a specified page</p>        </div></div></div><div class="blockelem create-flowy noselect"><input type="hidden" name="blockelemtype" class="blockelemtype" value="2"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                    <div class="blockico"><span></span><img src="assets/action.svg"></div><div class="blocktext">                        <p class="blocktitle">Action is performed</p><p class="blockdesc">Triggers when somebody performs a specified action</p></div></div></div><div class="blockelem create-flowy noselect"><input type="hidden" name="blockelemtype" class="blockelemtype" value="3"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                    <div class="blockico"><span></span><img src="assets/time.svg"></div><div class="blocktext">                        <p class="blocktitle">Time has passed</p><p class="blockdesc">Triggers after a specified amount of time</p>          </div></div></div><div class="blockelem create-flowy noselect"><input type="hidden" name="blockelemtype" class="blockelemtype" value="4"><div class="grabme"><img src="assets/grabme.svg"></div><div class="blockin">                    <div class="blockico"><span></span><img src="assets/error.svg"></div><div class="blocktext">                        <p class="blocktitle">Error prompt</p><p class="blockdesc">Triggers when a specified error happens</p>              </div></div></div>';
  const demo = new flowy(
    document.getElementById("canvas")!,
    drag,
    release,
    snapping
  );

  function addEventListenerMulti(
    type: string,
    listener: EventListener,
    capture: boolean,
    selector: string
  ) {
    const nodes = document.querySelectorAll(selector);
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].addEventListener(type, listener, capture);
    }
  }
  
  function drag(block: HTMLElement) {
    tempblock2 = document.createElement("div");
    tempblock2.className = "blockelem noselect";
    tempblock2.innerHTML = block.innerHTML;
    tempblock2.style.background = "#f9f9f9";
    tempblock2.style.left = "150px";
    tempblock2.style.top = "150px";
    tempblock2.classList.remove("blockelem");
    tempblock2.classList.add("blockelem2");
    tempblock2.style.position = "absolute";
    tempblock2.style.opacity = "0.5";
    tempblock = block;
    tempblock.classList.add("blockdrag");
    tempblock.parentNode!.appendChild(tempblock2);
    tempblock.style.left = "-500px";
    tempblock.style.top = "-500px";
    tempblock.style.position = "absolute";
    }

function release() {
  if (rightcard) {
    tempblock2.parentNode!.removeChild(tempblock2);
  } else {
    tempblock.parentNode!.removeChild(tempblock);
    tempblock.style.left = "0px";
    tempblock.style.top = "0px";
    tempblock.style.position = "relative";
  }
  rightcard = false;
}

function snapping(drag: HTMLElement, first: boolean): boolean {
  const grab = drag.querySelector(".grabme") as HTMLElement;
  grab.parentNode!.removeChild(grab);
  const blockin = drag.querySelector(".blockin") as HTMLElement;
  blockin.parentNode!.removeChild(blockin);

  if ((drag.querySelector(".blockelemtype") as HTMLInputElement).value == "1") {
    drag.innerHTML +=
      "<div class='blockyleft'><img src='assets/eyeblue.svg'><p class='blockyname'>New visitor</p></div><div class='blockyright'><img src='assets/more.svg'></div><div class='blockydiv'></div>";
  } else if ((drag.querySelector(".blockelemtype") as HTMLInputElement).value == "2") {
    drag.innerHTML +=
      "<div class='blockyleft'><img src='assets/actionblue.svg'><p class='blockyname'>Action is performed</p></div><div class='blockyright'><img src='assets/more.svg'></div><div class='blockydiv'></div>";
  } else if ((drag.querySelector(".blockelemtype") as HTMLInputElement).value == "3") {
    drag.innerHTML +=
      "<div class='blockyleft'><img src='assets/timeblue.svg'><p class='blockyname'>Time has passed</p></div><div class='blockyright'><img src='assets/more.svg'></div><div class='blockydiv'></div>";
  } else if ((drag.querySelector(".blockelemtype") as HTMLInputElement).value == "4") {
    drag.innerHTML +=
      "<div class='blockyleft'><img src='assets/errorblue.svg'><p class='blockyname'>Error prompt</p></div><div class='blockyright'><img src='assets/more.svg'></div><div class='blockydiv'></div>";
  }

  return true;
}

// Rest of the code remains unchanged
