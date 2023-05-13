type FlowyCallback = () => void;
type SnappingCallback = () => boolean;
type RearrangeCallback = () => boolean;

interface Block {
  childwidth: number;
  parent: number;
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BlockData {
  name: string;
  value: string;
}

interface BlockAttribute {
  [name: string]: string;
}

interface BlockOutput {
  id: number;
  parent: number;
  data: BlockData[];
  attr: BlockAttribute[];
}

interface Output {
  html: string;
  blockarr: Block[];
}

class Flowy {
  private loaded: boolean = false;
  private blocks: Block[] = [];
  private blockstemp: Block[] = [];
  private canvas_div: HTMLElement;
  private absx: number = 0;
  private absy: number = 0;
  private active: boolean = false;
  private paddingx: number;
  private paddingy: number;
  private offsetleft: number = 0;
  private rearrange: boolean = false;
  private drag?: HTMLElement;
  private dragx?: number;
  private dragy?: number;
  private original?: Element;
  private mouse_x?: number;
  private mouse_y?: number;
  private dragblock: boolean = false;
  private prevblock: number = 0;
  private el: HTMLElement;
  private grab: Function = (block: HTMLElement | Element) => {};
  
  constructor(
    canvas: HTMLElement,
    grab: FlowyCallback = () => {},
    release: FlowyCallback = () => {},
    snapping: SnappingCallback = () => true,
    rearrange: RearrangeCallback = () => false,
    spacing_x: number = 20,
    spacing_y: number = 80
  ) {
    this.canvas_div = canvas;
    this.paddingx = spacing_x;
    this.paddingy = spacing_y;
    // polyfill for the Element.matches and Element.closest methods
    if (!Element.prototype.matches) {
      Element.prototype.matches =
      Element.prototype.msMatchesSelector ||
      Element.prototype.webkitMatchesSelector;
    }
    if (!Element.prototype.closest) {
      Element.prototype.closest = function (s: string) {
        let el: any = this;
        do {
          if (Element.prototype.matches.call(el, s)) return el;
          el = el.parentElement || el.parentNode;
        } while (el !== null && el.nodeType === 1);
        return null;
      };
    }
    
    if (grab) {
      this.grab = grab;
    }
    
    this.el = document.createElement("DIV");
    this.el.classList.add("indicator");
    this.el.classList.add("invisible");
    this.canvas_div.appendChild(this.el);
    
    // Implement other methods
  }
    
  import(output: Output): void {
    this.canvas_div.innerHTML = output.html;
    for (let i = 0; i < output.blockarr.length; i++) {
      this.blocks.push({
        childwidth: output.blockarr[i].childwidth,
        parent: output.blockarr[i].parent,
        id: output.blockarr[i].id,
        x: output.blockarr[i].x,
        y: output.blockarr[i].y,
        width: output.blockarr[i].width,
        height: output.blockarr[i].height,
      });
    }
    if (this.blocks.length > 1) {
      this.rearrangeMe();
      this.checkOffset();
    }
  }
  
  output(): { html: string; blockarr: Block[]; blocks: BlockOutput[] } {
    const html_ser = this.canvas_div.innerHTML;
    const json_data = {
      html: html_ser,
      blockarr: this.blocks,
      blocks: [] as BlockOutput[],
    };
    if (this.blocks.length > 0) {
      for (let i = 0; i < this.blocks.length; i++) {
        const blockOutput: BlockOutput = {
          id: this.blocks[i].id,
          parent: this.blocks[i].parent,
          data: [],
          attr: [],
        };
        json_data.blocks.push(blockOutput);
        const blockParent = document.querySelector(
          `.blockid[value='${this.blocks[i].id}']`
          )?.parentNode;
        if (blockParent) {
          blockParent.querySelectorAll("input").forEach((block) => {
            const json_name = block.getAttribute("name");
            const json_value = block.value;
            blockOutput.data.push({
              name: json_name,
              value: json_value,
            });
          });
          Array.prototype.slice
          .call(blockParent.attributes)
          .forEach((attribute: Attr) => {
            const jsonobj: BlockAttribute = {};
            jsonobj[attribute.name] = attribute.value;
            blockOutput.attr.push(jsonobj);
          });
        }
      }
    }
    return json_data;
  }
    
  deleteBlocks(): void {
    this.blocks = [];
    this.canvas_div.innerHTML = "<div class='indicator invisible'></div>";
  }
  
  blockGrabbed(block: HTMLElement): void {
    this.grab(block);
  }
      
      beginDrag(event: MouseEvent | TouchEvent): void {
        if (
          window.getComputedStyle(this.canvas_div).position === "absolute" ||
          window.getComputedStyle(this.canvas_div).position === "fixed"
          ) {
          this.absx = this.canvas_div.getBoundingClientRect().left;
          this.absy = this.canvas_div.getBoundingClientRect().top;
        }
          
        const isTouchEvent = "targetTouches" in event;
        const clientX = isTouchEvent
        ? (event as TouchEvent).changedTouches[0].clientX
        : (event as MouseEvent).clientX;
        const clientY = isTouchEvent
        ? (event as TouchEvent).changedTouches[0].clientY
        : (event as MouseEvent).clientY;
        
        const targetElement = (event.target as HTMLElement).closest(
          ".create-flowy"
          );
        if (event instanceof MouseEvent && event.which === 3) return;
        if (!targetElement) return;
        
        this.original = targetElement;
        const newNode = targetElement.cloneNode(true) as HTMLElement;
        targetElement.classList.add("dragnow");
        newNode.classList.add("block");
        newNode.classList.remove("create-flowy");
        
        const blockId =
        this.blocks.length === 0
        ? 0
        : Math.max(...this.blocks.map((a) => a.id)) + 1;
        newNode.innerHTML += `<input type='hidden' name='blockid' class='blockid' value='${blockId}'>`;
        document.body.appendChild(newNode);
        
        this.drag = document.querySelector(`.blockid[value='${blockId}']`)
        ?.parentNode as HTMLElement;
        this.blockGrabbed(targetElement as HTMLElement);
        this.drag.classList.add("dragging");
        this.active = true;
        this.dragx = clientX - targetElement.getBoundingClientRect().left;
        this.dragy = clientY - targetElement.getBoundingClientRect().top;
        this.drag.style.left = `${clientX - this.dragx}px`;
        this.drag.style.top = `${clientY - this.dragy}px`;
      }
          
  endDrag(event: MouseEvent): void {
    if (event.which !== 3 && (this.active || this.rearrange)) {
      this.dragblock = false;
      this.blockReleased();
      const indicator = document.querySelector(".indicator");
      
      if (indicator && !indicator.classList.contains("invisible")) {
        indicator.classList.add("invisible");
      }
      
      if (this.active) {
        this.original?.classList.remove("dragnow");
        this.drag?.classList.remove("dragging");
      }
      
      const blockId = parseInt(
        this.drag?.querySelector(".blockid")?.value || ""
      );
        
      if (blockId === 0 && this.rearrange) {
        this.firstBlock("rearrange");
      } else if (
        this.active &&
        this.blocks.length === 0 &&
        this.drag.getBoundingClientRect().top + window.scrollY >
        this.canvas_div.getBoundingClientRect().top + window.scrollY &&
        this.drag.getBoundingClientRect().left + window.scrollX >
        this.canvas_div.getBoundingClientRect().left + window.scrollX
      ) {
        this.firstBlock("drop");
      } else if (this.active && this.blocks.length === 0) {
        this.removeSelection();
      } else if (this.active) {
        const blockIds = this.blocks.map((a) => a.id);
        for (let i = 0; i < this.blocks.length; i++) {
          if (this.checkAttach(blockIds[i])) {
            this.active = false;
            if (
              this.blockSnap(
                this.drag,
                false,
                document.querySelector(`.blockid[value='${blockIds[i]}']`)
                .parentNode as HTMLElement
                )
            ) {
              this.snap(this.drag, i, blockIds);
            } else {
              this.active = false;
              this.removeSelection();
            }
            break;
          } else if (i === this.blocks.length - 1) {
            this.active = false;
            this.removeSelection();
          }
        }
      } else if (this.rearrange) {
        const blockIds = this.blocks.map((a) => a.id);
        for (let i = 0; i < this.blocks.length; i++) {
          if (this.checkAttach(blockIds[i])) {
            this.active = false;
            this.drag.classList.remove("dragging");
            this.snap(this.drag, i, blockIds);
            break;
          } else if (i === this.blocks.length - 1) {
            if (
              this.beforeDelete(
                this.drag,
                this.blocks.filter((id) => id.id === blockIds[i])[0]
                )
            ) {
              this.active = false;
              this.drag.classList.remove("dragging");
              this.snap(this.drag, blockIds.indexOf(this.prevblock), blockIds);
              break;
            } else {
              this.rearrange = false;
              this.blockstemp = [];
              this.active = false;
              this.removeSelection();
              break;
            }
          }
        }
      }
    }
  }
                      
  checkAttach(id: number): boolean {
    const xpos =
    this.drag.getBoundingClientRect().left +
    window.scrollX +
    parseInt(window.getComputedStyle(this.drag).width) / 2 +
    this.canvas_div.scrollLeft -
    this.canvas_div.getBoundingClientRect().left;
    const ypos =
    this.drag.getBoundingClientRect().top +
    window.scrollY +
    this.canvas_div.scrollTop -
    this.canvas_div.getBoundingClientRect().top;
    const block = this.blocks.filter((a) => a.id === id)[0];
    
    if (
      xpos >= block.x - block.width / 2 - this.paddingx &&
      xpos <= block.x + block.width / 2 + this.paddingx &&
      ypos >= block.y - block.height / 2 &&
      ypos <= block.y + block.height
    ) {
      return true;
    } else {
      return false;
    }
  }
    
  removeSelection(): void {
    this.canvas_div.appendChild(document.querySelector(".indicator"));
    this.drag.parentNode?.removeChild(this.drag);
  }
                        
  firstBlock(type: string): void {
    if (type == "drop") {
      this.blockSnap(this.drag, true, undefined);
      this.active = false;
      this.drag.style.top =
      this.drag.getBoundingClientRect().top +
      window.scrollY -
      (this.absy + window.scrollY) +
      this.canvas_div.scrollTop +
      "px";
      this.drag.style.left =
      this.drag.getBoundingClientRect().left +
      window.scrollX -
      (this.absx + window.scrollX) +
      this.canvas_div.scrollLeft +
      "px";
      this.canvas_div.appendChild(this.drag);
      this.blocks.push({
        parent: -1,
        childwidth: 0,
        id: parseInt(this.drag.querySelector(".blockid").value),
        x:
        this.drag.getBoundingClientRect().left +
        window.scrollX +
        parseInt(window.getComputedStyle(this.drag).width) / 2 +
        this.canvas_div.scrollLeft -
        this.canvas_div.getBoundingClientRect().left,
        y:
        this.drag.getBoundingClientRect().top +
        window.scrollY +
        parseInt(window.getComputedStyle(this.drag).height) / 2 +
        this.canvas_div.scrollTop -
        this.canvas_div.getBoundingClientRect().top,
        width: parseInt(window.getComputedStyle(this.drag).width),
        height: parseInt(window.getComputedStyle(this.drag).height),
      });
    } else if (type == "rearrange") {
      this.drag.classList.remove("dragging");
      this.rearrange = false;
      for (let w = 0; w < this.blockstemp.length; w++) {
        if (
          this.blockstemp[w].id !=
          parseInt(this.drag.querySelector(".blockid").value)
        ) {
          const blockParent = document.querySelector(
            ".blockid[value='" + this.blockstemp[w].id + "']"
            ).parentNode;
          const arrowParent = document.querySelector(
            ".arrowid[value='" + this.blockstemp[w].id + "']"
            ).parentNode;
          blockParent.style.left =
          blockParent.getBoundingClientRect().left +
          window.scrollX -
          window.scrollX +
          this.canvas_div.scrollLeft -
          1 -
          this.absx +
          "px";
          blockParent.style.top =
          blockParent.getBoundingClientRect().top +
          window.scrollY -
          window.scrollY +
          this.canvas_div.scrollTop -
          this.absy -
          1 +
          "px";
          arrowParent.style.left =
          arrowParent.getBoundingClientRect().left +
          window.scrollX -
          window.scrollX +
          this.canvas_div.scrollLeft -
          this.absx -
          1 +
          "px";
          arrowParent.style.top =
          arrowParent.getBoundingClientRect().top +
          window.scrollY +
          this.canvas_div.scrollTop -
          1 -
          this.absy +
          "px";
          this.canvas_div.appendChild(blockParent);
          this.canvas_div.appendChild(arrowParent);
          this.blockstemp[w].x =
          blockParent.getBoundingClientRect().left +
          window.scrollX +
          parseInt(blockParent.offsetWidth) / 2 +
          this.canvas_div.scrollLeft -
          this.canvas_div.getBoundingClientRect().left -
          1;
          this.blockstemp[w].y =
          blockParent.getBoundingClientRect().top +
          window.scrollY +
          parseInt(blockParent.offsetHeight) / 2 +
          this.canvas_div.scrollTop -
          this.canvas_div.getBoundingClientRect().top -
          1;
        }
      }
      this.blockstemp.filter((a) => a.id == 0)[0].x =
      this.drag.getBoundingClientRect().left +
      window.scrollX +
      parseInt(window.getComputedStyle(this.drag).width) / 2 +
      this.canvas_div.scrollLeft -
      this.canvas_div.getBoundingClientRect().left;
      this.blockstemp.filter((a) => a.id == 0)[0].y =
      this.drag.getBoundingClientRect().top +
      window.scrollY +
      parseInt(window.getComputedStyle(this.drag).height) / 2 +
      this.canvas_div.scrollTop -
      this.canvas_div.getBoundingClientRect().top;
      this.blocks = this.blocks.concat(this.blockstemp);
      this.blockstemp = [];
    }
  }
                              
  drawArrow(arrow, x, y, id): void {
    if (x < 0) {
      this.canvas_div.innerHTML += `<div class="arrowblock"><input type="hidden" class="arrowid" value="${
        this.drag.querySelector(".blockid").value
        }"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M${
        this.blocks.filter((a) => a.id == id)[0].x - arrow.x + 5
      } 0L${this.blocks.filter((a) => a.id == id)[0].x - arrow.x + 5} ${
        this.paddingy / 2
      }L5 ${
        this.paddingy / 2
      }L5 ${y}" stroke="#C5CCD0" stroke-width="2px"/><path d="M0 ${
        y - 5
      }H10L5 ${y}L0 ${y - 5}Z" fill="#C5CCD0"/></svg></div>`;
      document.querySelector(
        `.arrowid[value="${this.drag.querySelector(".blockid").value}"]`
        ).parentNode.style.left =
        arrow.x -
        5 -
        (this.absx + window.scrollX) +
        this.canvas_div.scrollLeft +
        this.canvas_div.getBoundingClientRect().left +
        "px";
    } else {
      this.canvas_div.innerHTML += `<div class="arrowblock"><input type="hidden" class="arrowid" value="${
        this.drag.querySelector(".blockid").value
          }"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 0L20 ${
          this.paddingy / 2
        }L${x} ${
          this.paddingy / 2
        }L${x} ${y}" stroke="#C5CCD0" stroke-width="2px"/><path d="M${x - 5} ${
          y - 5
        }H${x + 5}L${x} ${y}L${x - 5} ${y - 5}Z" fill="#C5CCD0"/></svg></div>`;
      document.querySelector(
        `.arrowid[value="${parseInt(
          this.drag.querySelector(".blockid").value
          )}"]`
        ).parentNode.style.left =
          this.blocks.filter((a) => a.id == id)[0].x -
          20 -
          (this.absx + window.scrollX) +
          this.canvas_div.scrollLeft +
          this.canvas_div.getBoundingClientRect().left +
          "px";
    }
    document.querySelector(
      `.arrowid[value="${parseInt(this.drag.querySelector(".blockid").value)}"]`
      ).parentNode.style.top =
      this.blocks.filter((a) => a.id == id)[0].y +
      this.blocks.filter((a) => a.id == id)[0].height / 2 +
      this.canvas_div.getBoundingClientRect().top -
      this.absy +
      "px";
    }
      
  updateArrow(arrow, x, y, children): void {
    if (x < 0) {
      document.querySelector(
        `.arrowid[value="${children.id}"]`
        ).parentNode.style.left =
        arrow.x -
        5 -
        (this.absx + window.scrollX) +
        this.canvas_div.getBoundingClientRect().left +
        "px";
      document.querySelector(
        `.arrowid[value="${children.id}"]`
        ).parentNode.innerHTML = `<input type="hidden" class="arrowid" value="${
          children.id
        }"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M${
        this.blocks.filter((id) => id.id == children.parent)[0].x - arrow.x + 5
      } 0L${
        this.blocks.filter((id) => id.id == children.parent)[0].x - arrow.x + 5
      } ${this.paddingy / 2}L5 ${
        this.paddingy / 2
      }L5 ${y}" stroke="#C5CCD0" stroke-width="2px"/><path d="M0 ${
        y - 5
      }H10L5 ${y}L0 ${y - 5}Z" fill="#C5CCD0"/></svg>`;
    } else {
      document.querySelector(
        `.arrowid[value="${children.id}"]`
        ).parentNode.style.left =
        this.blocks.filter((id) => id.id == children.parent)[0].x -
        20 -
        (this.absx + window.scrollX) +
        this.canvas_div.getBoundingClientRect().left +
        "px";
      document.querySelector(
          `.arrowid[value="${children.id}"]`
          ).parentNode.innerHTML = `<input type="hidden" class="arrowid" value="${
            children.id
          }"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 0L20 ${
          this.paddingy / 2
        }L${x} ${
          this.paddingy / 2
        }L${x} ${y}" stroke="#C5CCD0" stroke-width="2px"/><path d="M${x - 5} ${
          y - 5
        }H${x + 5}L${x} ${y}L${x - 5} ${y - 5}Z" fill="#C5CCD0"/></svg>`;
    }
  }
          
  snap(drag: HTMLElement, i: number, blocko: Array<number>): void {
    if (!this.rearrange) {
      this.canvas_div.appendChild(drag);
    }
    let totalwidth = 0;
    let totalremove = 0;
    let maxheight = 0;
    const parentBlocks = this.blocks.filter(id => id.parent === blocko[i]);
    
    for (let w = 0; w < parentBlocks.length; w++) {
      const children = parentBlocks[w];
      if (children.childwidth > children.width) {
        totalwidth += children.childwidth + this.paddingx;
      } else {
        totalwidth += children.width + this.paddingx;
      }
    }
    
    totalwidth += parseInt(window.getComputedStyle(drag).width);
    
    for (let w = 0; w < parentBlocks.length; w++) {
      const children = parentBlocks[w];
      const grandparentBlock = this.blocks.filter(a => a.id === blocko[i])[0];
      
      if (children.childwidth > children.width) {
        document.querySelector(`.blockid[value='${children.id}']`).parentNode.style.left = grandparentBlock.x - (totalwidth / 2) + totalremove + (children.childwidth / 2) - (children.width / 2) + "px";
        children.x = grandparentBlock.x - (totalwidth / 2) + totalremove + (children.childwidth / 2);
        totalremove += children.childwidth + this.paddingx;
      } else {
        document.querySelector(`.blockid[value='${children.id}']`).parentNode.style.left = grandparentBlock.x - (totalwidth / 2) + totalremove + "px";
        children.x = grandparentBlock.x - (totalwidth / 2) + totalremove + (children.width / 2);
        totalremove += children.width + this.paddingx;
      }
    }
    
    const targetBlock = this.blocks.filter(id => id.id === blocko[i])[0];
    
    drag.style.left = targetBlock.x - (totalwidth / 2) + totalremove - (window.scrollX + this.absx) + this.canvas_div.scrollLeft + this.canvas_div.getBoundingClientRect().left + "px";
    drag.style.top = targetBlock.y + (targetBlock.height / 2) + this.paddingy - (window.scrollY + this.absy) + this.canvas_div.getBoundingClientRect().top + "px";
    
    if (this.rearrange) {
      const blockID = parseInt(drag.querySelector(".blockid").value);
      const blockTemp = this.blockstemp.filter(a => a.id === blockID)[0];
      
      blockTemp.x = (drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(drag).width) / 2) + this.canvas_div.scrollLeft - this.canvas_div.getBoundingClientRect().left;
      blockTemp.y = (drag.getBoundingClientRect().top + window.scrollY) + (parseInt(window.getComputedStyle(drag).height) / 2) + this.canvas_div.scrollTop - this.canvas_div.getBoundingClientRect().top;
      blockTemp.parent = blocko[i];
      
      for (let w = 0; w < this.blockstemp.length; w++) {
        if (this.blockstemp[w].id !== blockID) {
          const blockParent = document.querySelector(`.blockid[value='${this.blockstemp[w].id}']`).parentNode;
          const arrowParent = document.querySelector(`.arrowid[value='${this.blockstemp[w].id}']`).parentNode;
          
          blockParent.style.left = (blockParent.getBoundingClientRect().left + window.scrollX) - (window.scrollX + canvas_div.getBoundingClientRect().left) + canvas_div.scrollLeft + "px";
          window.scrollX + this.canvas_div.getBoundingClientRect().left) + this.canvas_div.scrollLeft + "px";
          blockParent.style.top = (blockParent.getBoundingClientRect().top + window.scrollY) - (window.scrollY + this.canvas_div.getBoundingClientRect().top) + this.canvas_div.scrollTop + "px";
          arrowParent.style.left = (arrowParent.getBoundingClientRect().left + window.scrollX) - (window.scrollX + this.canvas_div.getBoundingClientRect().left) + this.canvas_div.scrollLeft + 20 + "px";
          arrowParent.style.top = (arrowParent.getBoundingClientRect().top + window.scrollY) - (window.scrollY + this.canvas_div.getBoundingClientRect().top) + this.canvas_div.scrollTop + "px";
          this.canvas_div.appendChild(blockParent);
          this.canvas_div.appendChild(arrowParent);
          
          this.blockstemp[w].x = (blockParent.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(blockParent).width) / 2) + this.canvas_div.scrollLeft - this.canvas_div.getBoundingClientRect().left;
          this.blockstemp[w].y = (blockParent.getBoundingClientRect().top + window.scrollY) + (parseInt(window.getComputedStyle(blockParent).height) / 2) + this.canvas_div.scrollTop - this.canvas_div.getBoundingClientRect().top;
        }
      }
      this.blocks = this.blocks.concat(this.blockstemp);
      this.blockstemp = [];
    } else {
      this.blocks.push({
        childwidth: 0,
        parent: blocko[i],
        id: parseInt(drag.querySelector(".blockid").value),
        x: (drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(drag).width) / 2) + this.canvas_div.scrollLeft - this.canvas_div.getBoundingClientRect().left,
        y: (drag.getBoundingClientRect().top + window.scrollY) + (parseInt(window.getComputedStyle(drag).height) / 2) + this.canvas_div.scrollTop - this.canvas_div.getBoundingClientRect().top,
        width: parseInt(window.getComputedStyle(drag).width),
        height: parseInt(window.getComputedStyle(drag).height)
      });
    }
    
    const arrowblock = this.blocks.filter(a => a.id === parseInt(drag.querySelector(".blockid").value))[0];
    const arrowx = arrowblock.x - targetBlock.x + 20;
    const arrowy = this.paddingy;
    this.drawArrow(arrowblock, arrowx, arrowy, blocko[i]);
    
    if (targetBlock.parent !== -1) {
      let flag = false;
      let idval = blocko[i];
      while (!flag) {
        if (this.blocks.filter(a => a.id === idval)[0].parent === -1) {
          flag = true;
        } else {
          let zwidth = 0;
          const idvalBlocks = this.blocks.filter(id => id.parent === idval);
          
          for (let w = 0; w < idvalBlocks.length; w++) {
            const children = idvalBlocks[w];
            if (children.childwidth > children.width) {
              if (w === idvalBlocks.length - 1) {
                zwidth += children.childwidth;
              } else {
                zwidth += children.childwidth + this.paddingx;
              }
            } else {
              if (w === idvalBlocks.length - 1) {
                zwidth += children.width;
              } else {
                zwidth += children.width + this.paddingx;
              }
            }
          }
          this.blocks.filter(a => a.id === idval)[0].childwidth = zwidth;
          idval = this.blocks.filter(a => a.id === idval)[0].parent;
        }
      }
      this.blocks.filter(id => id.id === idval)[0].childwidth = totalwidth;
    }
    
    if (this.rearrange) {
      this.rearrange = false;
      drag.classList.remove("dragging");
    }
    this.rearrangeMe();
    this.checkOffset();
  }
          
          
  touchblock(event: MouseEvent | TouchEvent): void {
    let dragblock = false;
    const targetElement = event.target as HTMLElement;
    
    if (hasParentClass(targetElement, "block")) {
      const theblock = targetElement.closest(".block") as HTMLElement;
      let mouse_x: number;
      let mouse_y: number;
      
      if ('targetTouches' in event) {
        mouse_x = (event as TouchEvent).targetTouches[0].clientX;
        mouse_y = (event as TouchEvent).targetTouches[0].clientY;
      } else {
        mouse_x = (event as MouseEvent).clientX;
        mouse_y = (event as MouseEvent).clientY;
      }
      
      if (event.type !== "mouseup" && hasParentClass(targetElement, "block")) {
        if ('which' in event && (event as MouseEvent).which !== 3) {
          if (!active && !rearrange) {
            dragblock = true;
            drag = theblock;
            dragx = mouse_x - (drag.getBoundingClientRect().left + window.scrollX);
            dragy = mouse_y - (drag.getBoundingClientRect().top + window.scrollY);
          }
        }
      }
    }
  }
          
  hasParentClass(element: HTMLElement, classname: string): boolean {
      if (element.className) {
          if (element.className.split(' ').indexOf(classname) >= 0) return true;
        }
        
    return element.parentNode instanceof HTMLElement && this.hasParentClass(element.parentNode, classname);
  }
  
  moveBlock(event: MouseEvent | TouchEvent): void {
    let mouse_x: number;
    let mouse_y: number;

    if ('targetTouches' in event) {
      mouse_x = event.targetTouches[0].clientX;
      mouse_y = event.targetTouches[0].clientY;
    } else {
      mouse_x = event.clientX;
      mouse_y = event.clientY;
    }

    if (this.dragblock) {
      this.rearrange = true;
      this.drag.classList.add("dragging");
      const blockid = parseInt(this.drag.querySelector(".blockid").value);
      const prevblock = this.blocks.filter(a => a.id === blockid)[0].parent;
      this.blockstemp.push(this.blocks.filter(a => a.id === blockid)[0]);
      this.blocks = this.blocks.filter(e => e.id !== blockid);

      if (blockid !== 0) {
          document.querySelector(".arrowid[value='" + blockid + "']").parentNode.remove();
      }

      let layer = this.blocks.filter(a => a.parent === blockid);
      let flag = false;
      let foundids = [];
      let allids = [];

      while (!flag) {
          for (let i = 0; i < layer.length; i++) {
              if (layer[i] !== blockid) {
                  this.blockstemp.push(this.blocks.filter(a => a.id === layer[i].id)[0]);
                  const blockParent = document.querySelector(".blockid[value='" + layer[i].id + "']").parentNode;
                  const arrowParent = document.querySelector(".arrowid[value='" + layer[i].id + "']").parentNode;
                  blockParent.style.left = `${(blockParent.getBoundingClientRect().left + window.scrollX) - (this.drag.getBoundingClientRect().left + window.scrollX)}px`;
                  blockParent.style.top = `${(blockParent.getBoundingClientRect().top + window.scrollY) - (this.drag.getBoundingClientRect().top + window.scrollY)}px`;
                  arrowParent.style.left = `${(arrowParent.getBoundingClientRect().left + window.scrollX) - (this.drag.getBoundingClientRect().left + window.scrollX)}px`;
                  arrowParent.style.top = `${(arrowParent.getBoundingClientRect().top + window.scrollY) - (this.drag.getBoundingClientRect().top + window.scrollY)}px`;
                  this.drag.appendChild(blockParent);
                  this.drag.appendChild(arrowParent);
                  foundids.push(layer[i].id);
                  allids.push(layer[i].id);
              }
          }

          if (foundids.length === 0) {
              flag = true;
          } else {
              layer = this.blocks.filter(a => foundids.includes(a.parent));
              foundids = [];
          }
      }

      for (let i = 0; i < this.blocks.filter(a => a.parent === blockid).length; i++) {
        const blocknumber = this.blocks.filter(a => a.parent === blockid)[i];
        this.blocks = this.blocks.filter(e => e.id !== blocknumber);
      }

      for (let i = 0; i < allids.length; i++) {
        const blocknumber = allids[i];
        this.blocks = this.blocks.filter(e => e.id !== blocknumber);
      }

      if (this.blocks.length > 1) {
        this.rearrangeMe();
      }

      this.dragblock = false;
    }


    if (this.active) {
      this.drag.style.left = `${mouse_x - this.dragx}px`;
      this.drag.style.top = `${mouse_y - this.dragy}px`;
    } else if (this.rearrange) {
      this.drag.style.left = `${mouse_x - this.dragx - (window.scrollX + this.absx) + this.canvas_div.scrollLeft}px`;
      this.drag.style.top = `${mouse_y - this.dragy - (window.scrollY + this.absy) + this.canvas_div.scrollTop}px`;
      this.blockstemp.filter(a => a.id === parseInt(this.drag.querySelector(".blockid").value)).x = (this.drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(this.drag).width) / 2) + this.canvas_div.scrollLeft;
      this.blockstemp.filter(a => a.id === parseInt(this.drag.querySelector(".blockid").value)).y = (this.drag.getBoundingClientRect().top + window.scrollY) + (parseInt(window.getComputedStyle(this.drag).height) / 2) + this.canvas_div.scrollTop;
    }

    if (this.active || this.rearrange) {
      if (this.active) {
        this.drag.style.left = `${this.mouse_x - this.dragx}px`;
        this.drag.style.top = `${this.mouse_y - this.dragy}px`;
      } else if (this.rearrange) {
        this.drag.style.left = `${this.mouse_x - this.dragx - (window.scrollX + this.absx) + this.canvas_div.scrollLeft}px`;
        this.drag.style.top = `${this.mouse_y - this.dragy - (window.scrollY + this.absy) + this.canvas_div.scrollTop}px`;
        this.blockstemp.filter(a => a.id === parseInt(this.drag.querySelector(".blockid").value)).x = (this.drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(this.drag).width) / 2) + this.canvas_div.scrollLeft;
        this.blockstemp.filter(a => a.id === parseInt(this.drag.querySelector(".blockid").value)).y = (this.drag.getBoundingClientRect().top + window.scrollY) + (parseInt(window.getComputedStyle(this.drag).height) / 2) + this.canvas_div.scrollTop;
      }

      if (this.mouse_x > this.canvas_div.getBoundingClientRect().width + this.canvas_div.getBoundingClientRect().left - 10 && this.mouse_x < this.canvas_div.getBoundingClientRect().width + this.canvas_div.getBoundingClientRect().left + 10) {
        this.canvas_div.scrollLeft += 10;
      } else if (this.mouse_x < this.canvas_div.getBoundingClientRect().left + 10 && this.mouse_x > this.canvas_div.getBoundingClientRect().left - 10) {
        this.canvas_div.scrollLeft -= 10;
      } else if (this.mouse_y > this.canvas_div.getBoundingClientRect().height + this.canvas_div.getBoundingClientRect().top - 10 && this.mouse_y < this.canvas_div.getBoundingClientRect().height + this.canvas_div.getBoundingClientRect().top + 10) {
        this.canvas_div.scrollTop += 10;
      } else if (this.mouse_y < this.canvas_div.getBoundingClientRect().top + 10 && this.mouse_y > this.canvas_div.getBoundingClientRect().top - 10) {
        this.canvas_div.scrollLeft -= 10;
      }

      const xpos = (this.drag.getBoundingClientRect().left + window.scrollX) + (parseInt(window.getComputedStyle(this.drag).width) / 2) + this.canvas_div.scrollLeft - this.canvas_div.getBoundingClientRect().left;
      const ypos = (this.drag.getBoundingClientRect().top + window.scrollY) + this.canvas_div.scrollTop - this.canvas_div.getBoundingClientRect().top;
      const blocko = this.blocks.map(a => a.id);

      for (let i = 0; i < this.blocks.length; i++) {
        if (this.checkAttach(blocko[i])) {
          document.querySelector(".blockid[value='" + blocko[i] + "']").parentNode.appendChild(document.querySelector(".indicator"));
          document.querySelector(".indicator").style.left = `${(document.querySelector(".blockid[value='" + blocko[i] + "']").parentNode.offsetWidth / 2) - 5}px`;
          document.querySelector(".indicator").style.top = `${document.querySelector(".blockid[value='" + blocko[i] + "']").parentNode.offsetHeight}px`;
          document.querySelector(".indicator").classList.remove("invisible");
          break;
        } else if (i === this.blocks.length - 1) {
          if (!document.querySelector(".indicator").classList.contains("invisible")) {
            document.querySelector(".indicator").classList.add("invisible");
          }
        }
      }
    }
  }
  
  checkOffset(): void {
    let offsetleftX = this.blocks.map(a => a.x);
    const widths = this.blocks.map(a => a.width);
    const mathmin = offsetleftX.map(function(item, index) {
        return item - (widths[index] / 2);
    });
    const offsetleft = Math.min.apply(Math, mathmin);

    if (offsetleft < (this.canvas_div.getBoundingClientRect().left + window.scrollX - this.absx)) {
      const blocko = this.blocks.map(a => a.id);

      for (let w = 0; w < this.blocks.length; w++) {
        document.querySelector(".blockid[value='" + this.blocks.filter(a => a.id === blocko[w])[0].id + "']").parentNode.style.left = `${this.blocks.filter(a => a.id === blocko[w])[0].x - (this.blocks.filter(a => a.id === blocko[w])[0].width / 2) - offsetleft + this.canvas_div.getBoundingClientRect().left - this.absx + 20}px`;

        if (this.blocks.filter(a => a.id === blocko[w])[0].parent !== -1) {
            const arrowblock = this.blocks.filter(a => a.id === blocko[w])[0];
            const arrowx = arrowblock.x - this.blocks.filter(a => a.id === this.blocks.filter(a => a.id === blocko[w])[0].parent)[0].x;

            if (arrowx < 0) {
                document.querySelector('.arrowid[value="' + blocko[w] + '"]').parentNode.style.left = `${(arrowblock.x - offsetleft + 20 - 5) + this.canvas_div.getBoundingClientRect().left - this.absx}px`;
            } else {
                document.querySelector('.arrowid[value="' + blocko[w] + '"]').parentNode.style.left = `${this.blocks.filter(id => id.id === this.blocks.filter(a => a.id === blocko[w])[0].parent)[0].x - 20 - offsetleft + this.canvas_div.getBoundingClientRect().left - this.absx + 20}px`;
            }
        }
      }

      for (let w = 0; w < this.blocks.length; w++) {
        this.blocks[w].x = (document.querySelector(".blockid[value='" + this.blocks[w].id + "']").parentNode.getBoundingClientRect().left + window.scrollX) + (this.canvas_div.scrollLeft) + (parseInt(window.getComputedStyle(document.querySelector(".blockid[value='" + this.blocks[w].id + "']").parentNode).width) / 2) - 20 - this.canvas_div.getBoundingClientRect().left;
      }
    }
  }

}
