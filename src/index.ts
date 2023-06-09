type FlowyCallback = () => void;
type SnappingCallback = (
  drag: HTMLElement,
  first: boolean,
  parent: HTMLElement | null
) => boolean;

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
  public loaded: boolean = false;
  private blocks: Block[] = [];
  private tempBlocks: Block[] = [];
  private canvasDiv: HTMLElement;
  private absX: number = 0;
  private absY: number = 0;
  private active: boolean = false;
  private paddingX: number;
  private paddingY: number;
  private offsetleftX: number[] = [];
  private drag = (block: HTMLElement | Element) => {};
  private dragX?: number;
  private dragY?: number;
  private original?: Element;
  private mouseX?: number;
  private mouseY?: number;
  private dragblock: boolean = false;
  private prevblock: number = 0;
  private el: HTMLElement;
  private grab = (block: HTMLElement | Element) => {};
  private release: FlowyCallback = () => {};
  private snapping: SnappingCallback = (
    drag: HTMLElement,
    first: boolean,
    parent: HTMLElement | null
  ) => true;
  private rearrange: boolean;

  constructor(
    canvas: HTMLElement,
    grab: FlowyCallback = () => {},
    release: FlowyCallback = () => {},
    snapping: SnappingCallback = () => true,
    spacingX: number = 20,
    spacingY: number = 80
  ) {
    this.canvasDiv = canvas;
    this.paddingX = spacingX;
    this.paddingY = spacingY;
    this.grab = grab;
    this.release = release;
    this.snapping = snapping;
    this.rearrange = false;

    const canvasPosition = window.getComputedStyle(this.canvasDiv).position;

    if (canvasPosition === "absolute" || canvasPosition === "fixed") {
      this.absX = this.canvasDiv.getBoundingClientRect().left;
      this.absY = this.canvasDiv.getBoundingClientRect().top;
    }
    // polyfill for the Element.closest method
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

    this.el = document.createElement("DIV");
    this.el.classList.add("indicator");
    this.el.classList.add("invisible");
    this.canvasDiv.appendChild(this.el);

    this.loaded = true;
  }

  import(output: Output): void {
    this.canvasDiv.innerHTML = output.html;
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
    const canvasHTML = this.canvasDiv.innerHTML;
    const outputData = {
      html: canvasHTML,
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
        outputData.blocks.push(blockOutput);
        const blockParent = document.querySelector(
          `.blockid[value='${this.blocks[i].id}']`
        )?.parentElement;

        if (blockParent) {
          blockParent.querySelectorAll("input").forEach((block) => {
            const json_name = block.getAttribute("name");
            const json_value = block.value;
            blockOutput.data.push({
              name: json_name || "",
              value: json_value,
            });
          });

          blockOutput.attr = Array.from(blockParent.attributes).map(
            (attribute: Attr) => ({
              [attribute.name]: attribute.value,
            })
          );
        }
      }
    }
    return outputData;
  }

  deleteBlocks(): void {
    this.blocks = [];
    this.canvasDiv.innerHTML = `<div class='indicator invisible'></div>`;
  }

  blockGrabbed(block: HTMLElement): void {
    this.grab(block);
  }

  beginDrag(event: MouseEvent | TouchEvent): void {
    const canvasPosition = window.getComputedStyle(this.canvasDiv).position;

    if (canvasPosition === "absolute" || canvasPosition === "fixed") {
      this.absX = this.canvasDiv.getBoundingClientRect().left;
      this.absY = this.canvasDiv.getBoundingClientRect().top;
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
    if (event instanceof MouseEvent && event.button === 2) return;
    if (!targetElement) return;

    this.original = targetElement;
    const newNode = targetElement.cloneNode(true) as HTMLElement;
    targetElement.classList.add("dragnow");
    newNode.classList.add("block");
    newNode.classList.remove("create-flowy");

    const blockId =
      this.blocks.length === 0
        ? 0
        : Math.max(...this.blocks.map((block) => block.id)) + 1;
    newNode.innerHTML += `<input type='hidden' name='blockid' class='blockid' value='${blockId}'>`;
    document.body.appendChild(newNode);

    this.drag = document.querySelector(`.blockid[value='${blockId}']`)
      ?.parentNode as HTMLElement;
    this.blockGrabbed(targetElement as HTMLElement);
    this.drag.classList.add("dragging");
    this.active = true;
    this.dragX = clientX - targetElement.getBoundingClientRect().left;
    this.dragY = clientY - targetElement.getBoundingClientRect().top;
    this.drag.style.left = `${clientX - this.dragX}px`;
    this.drag.style.top = `${clientY - this.dragY}px`;
  }

  endDrag(event: MouseEvent): void {
    if (event.button === 2 && (this.active || this.rearrange)) {
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

      const blockInputElement =
        this.drag?.querySelector<HTMLInputElement>(".blockid");
      const blockId = parseInt(blockInputElement?.value ?? "0");

      if (blockId === 0 && this.rearrange) {
        this.firstBlock("rearrange");
      } else if (
        this.active &&
        this.blocks.length === 0 &&
        this.drag &&
        this.drag.getBoundingClientRect().top + window.scrollY >
          this.canvasDiv.getBoundingClientRect().top + window.scrollY &&
        this.drag.getBoundingClientRect().left + window.scrollX >
          this.canvasDiv.getBoundingClientRect().left + window.scrollX
      ) {
        this.firstBlock("drop");
      } else if (this.active && this.blocks.length === 0) {
        this.removeSelection();
      } else if (this.active) {
        const blockIds = this.blocks.map((a) => a.id);
        for (let i = 0; i < this.blocks.length; i++) {
          if (this.checkAttach(blockIds[i])) {
            this.active = false;
            const blockElement = document.querySelector(
              `.blockid[value='${blockIds[i]}']`
            );
            const parentNode = blockElement?.parentNode as HTMLElement | null;
            if (this.drag && this.blockSnap(this.drag, false, parentNode)) {
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
            this.drag?.classList.remove("dragging");
            if (this.drag) this.snap(this.drag, i, blockIds);
            break;
          } else if (i === this.blocks.length - 1) {
            if (
              this.drag &&
              this.beforeDelete(
                this.drag,
                this.blocks.filter((id) => id.id === blockIds[i])[0]
              )
            ) {
              this.active = false;
              this.drag?.classList.remove("dragging");
              this.snap(this.drag, blockIds.indexOf(this.prevblock), blockIds);
              break;
            } else {
              this.rearrange = false;
              this.tempBlocks = [];
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
    if (!this.drag) return false;
    const dragBounding = this.drag.getBoundingClientRect();
    const canvasBounding = this.canvasDiv.getBoundingClientRect();
    const xpos =
      dragBounding.left +
      window.scrollX +
      parseInt(window.getComputedStyle(this.drag).width) / 2 +
      this.canvasDiv.scrollLeft -
      canvasBounding.left;
    const ypos =
      dragBounding.top +
      window.scrollY +
      this.canvasDiv.scrollTop -
      canvasBounding.top;
    const block = this.blocks.filter((a) => a.id === id)[0];

    if (
      xpos >= block.x - block.width / 2 - this.paddingX &&
      xpos <= block.x + block.width / 2 + this.paddingX &&
      ypos >= block.y - block.height / 2 &&
      ypos <= block.y + block.height
    ) {
      return true;
    } else {
      return false;
    }
  }

  removeSelection(): void {
    const indicator = document.querySelector(".indicator");
    if (indicator instanceof Node) {
      this.canvasDiv.appendChild(indicator);
    }
    if (this.drag) {
      this.drag.parentNode?.removeChild(this.drag);
    }
  }

  firstBlock(type: string): void {
    if (type === "drop" && this.drag) {
      this.blockSnap(this.drag, true, null);
      this.active = false;

      const dragTop = this.drag.getBoundingClientRect().top + window.scrollY;
      const windowHeight = this.absY + window.scrollY;
      const scrollTop = this.canvasDiv.scrollTop;
      this.drag.style.top = `${dragTop - windowHeight + scrollTop}px`;

      const dragLeft = this.drag.getBoundingClientRect().left + window.scrollX;
      const windowWidth = this.absX + window.scrollX;
      const scrollLeft = this.canvasDiv.scrollLeft;
      this.drag.style.left = `${dragLeft - windowWidth + scrollLeft}px`;

      this.canvasDiv.appendChild(this.drag);

      const blockIdInput = this.drag.querySelector(".blockid") as
        | HTMLInputElement
        | HTMLTextAreaElement;
      const id = blockIdInput ? parseInt(blockIdInput.value) : -1;

      const width = parseInt(window.getComputedStyle(this.drag).width);
      const height = parseInt(window.getComputedStyle(this.drag).height);

      this.blocks.push({
        parent: -1,
        childwidth: 0,
        id,
        x:
          dragLeft +
          width / 2 +
          scrollLeft -
          this.canvasDiv.getBoundingClientRect().left,
        y:
          dragTop +
          height / 2 +
          scrollTop -
          this.canvasDiv.getBoundingClientRect().top,
        width,
        height,
      });
    } else if (type === "rearrange" && this.drag) {
      this.drag.classList.remove("dragging");
      this.rearrange = false;

      const blockIdElement = this.drag.querySelector(
        ".blockid"
      ) as HTMLInputElement;
      const blockId = blockIdElement ? parseInt(blockIdElement.value) : NaN;

      for (const tempBlock of this.tempBlocks) {
        if (tempBlock.id !== blockId) {
          const blockIdValue = tempBlock.id;
          const blockElement = document.querySelector(
            `.blockid[value='${blockIdValue}']`
          );
          const blockParent = blockElement
            ? (blockElement.parentNode as HTMLElement)
            : null;

          if (blockParent) {
            const blockParentLeft = blockParent
              ? blockParent.getBoundingClientRect().left +
                this.canvasDiv.scrollLeft -
                this.absX -
                1
              : 0;
            blockParent.style.left = `${blockParentLeft}px`;

            const blockParentTop = blockParent
              ? blockParent.getBoundingClientRect().top +
                this.canvasDiv.scrollTop -
                this.absY -
                1
              : 0;
            blockParent.style.top = `${blockParentTop}px`;
            this.canvasDiv.appendChild(blockParent);

            tempBlock.x =
              blockParentLeft +
              blockParent.offsetWidth / 2 +
              this.canvasDiv.scrollLeft -
              this.canvasDiv.getBoundingClientRect().left -
              1;
            tempBlock.y =
              blockParentTop +
              blockParent.offsetHeight / 2 +
              this.canvasDiv.scrollTop -
              this.canvasDiv.getBoundingClientRect().top -
              1;
          }

          const arrowElement = document.querySelector(
            `.arrowid[value='${blockIdValue}']`
          );
          const arrowParent = arrowElement
            ? (arrowElement.parentNode as HTMLElement)
            : null;

          if (arrowParent) {
            const arrowParentLeft = arrowParent
              ? arrowParent.getBoundingClientRect().left +
                this.canvasDiv.scrollLeft -
                this.absX -
                1
              : 0;
            arrowParent.style.left = `${arrowParentLeft}px`;

            const arrowParentTop = arrowParent
              ? arrowParent.getBoundingClientRect().top +
                this.canvasDiv.scrollTop -
                this.absY -
                1
              : 0;
            arrowParent.style.top = `${arrowParentTop}px`;
            this.canvasDiv.appendChild(arrowParent);
          }
        }
      }
      this.tempBlocks.filter((a) => a.id == 0)[0].x =
        this.drag.getBoundingClientRect().left +
        window.scrollX +
        parseInt(window.getComputedStyle(this.drag).width) / 2 +
        this.canvasDiv.scrollLeft -
        this.canvasDiv.getBoundingClientRect().left;
      this.tempBlocks.filter((a) => a.id == 0)[0].y =
        this.drag.getBoundingClientRect().top +
        window.scrollY +
        parseInt(window.getComputedStyle(this.drag).height) / 2 +
        this.canvasDiv.scrollTop -
        this.canvasDiv.getBoundingClientRect().top;
      this.blocks = this.blocks.concat(this.tempBlocks);
      this.tempBlocks = [];
    }
  }

  drawArrow(arrow: Block, x: number, y: number, id: number): void {
    if (x < 0) {
      const blockIdElement = this.drag?.querySelector(
        ".blockid"
      ) as HTMLInputElement | null;
      const blockIdValue = blockIdElement ? blockIdElement.value : "";

      if (blockIdElement) {
        this.canvasDiv.innerHTML += `<div class="arrowblock">
          <input type="hidden" class="arrowid" value="${blockIdValue}">
            <svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M${
                this.blocks.filter((a) => a.id === id)[0].x - arrow.x + 5
              } 0L${
          this.blocks.filter((a) => a.id === id)[0].x - arrow.x + 5
        } ${this.paddingY / 2}L5 ${
          this.paddingY / 2
        }L5 ${y}" stroke="#C5CCD0" stroke-width="2px"/>
              <path d="M0 ${y - 5}H10L5 ${y}L0 ${y - 5}Z" fill="#C5CCD0"/>
            </svg>
            </div>`;

        const arrowSelector = `.arrowid[value="${blockIdValue}"]`;
        const arrowElement = document.querySelector(
          arrowSelector
        ) as HTMLElement | null;

        if (arrowElement) {
          const parentNode = arrowElement.parentNode as HTMLElement;
          const left =
            arrow.x -
            5 -
            (this.absX + window.scrollX) +
            this.canvasDiv.scrollLeft +
            this.canvasDiv.getBoundingClientRect().left +
            "px";

          parentNode.style.left = left;
        }
      }
    } else {
      const blockIdElement = this.drag?.querySelector(
        ".blockid"
      ) as HTMLInputElement | null;
      const blockIdValue = blockIdElement ? blockIdElement.value : "";

      if (blockIdElement) {
        this.canvasDiv.innerHTML += `<div class="arrowblock"><input type="hidden" class="arrowid" value="${blockIdValue}"><svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 0L20 ${
          this.paddingY / 2
        }L${x} ${
          this.paddingY / 2
        }L${x} ${y}" stroke="#C5CCD0" stroke-width="2px"/><path d="M${x - 5} ${
          y - 5
        }H${x + 5}L${x} ${y}L${x - 5} ${y - 5}Z" fill="#C5CCD0"/></svg></div>`;

        const arrowSelector = `.arrowid[value="${blockIdValue}"]`;
        const arrowElement = document.querySelector(
          arrowSelector
        ) as HTMLElement | null;

        if (arrowElement) {
          const parentNode = arrowElement.parentNode as HTMLElement;
          const left =
            this.blocks.filter((a) => a.id == id)[0].x -
            20 -
            (this.absX + window.scrollX) +
            this.canvasDiv.scrollLeft +
            this.canvasDiv.getBoundingClientRect().left +
            "px";

          parentNode.style.left = left;
        }
      }
    }

    const blockIdElement = this.drag?.querySelector(
      ".blockid"
    ) as HTMLInputElement | null;
    const blockIdValue = blockIdElement ? blockIdElement.value : "";

    if (blockIdElement) {
      const arrowSelector = `.arrowid[value="${parseInt(blockIdValue)}"]`;
      const arrowElement = document.querySelector(
        arrowSelector
      ) as HTMLElement | null;

      if (arrowElement) {
        const parentNode = arrowElement.parentNode as HTMLElement;
        const top =
          this.blocks.filter((a) => a.id == id)[0].y +
          this.blocks.filter((a) => a.id == id)[0].height / 2 +
          this.canvasDiv.getBoundingClientRect().top -
          this.absY +
          "px";

        parentNode.style.top = top;
      }
    }
  }

  updateArrow(arrow: Block, x: number, y: number, children: Block): void {
    const arrowSelector = `.arrowid[value="${children.id}"]`;
    const arrowElement = document.querySelector(
      arrowSelector
    ) as HTMLElement | null;

    if (arrowElement && arrowElement.parentNode instanceof HTMLElement) {
      if (x < 0) {
        arrowElement.parentNode.style.left =
          arrow.x -
          5 -
          (this.absX + window.scrollX) +
          this.canvasDiv.getBoundingClientRect().left +
          "px";
        arrowElement.parentNode.innerHTML = `<input type="hidden" class="arrowid" value="${
          children.id
        }">
        <svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M${
            this.blocks.filter((id) => id.id == children.parent)[0].x -
            arrow.x +
            5
          } 0L${
          this.blocks.filter((id) => id.id == children.parent)[0].x -
          arrow.x +
          5
        } ${this.paddingY / 2}L5 ${
          this.paddingY / 2
        }L5 ${y}" stroke="#C5CCD0" stroke-width="2px"/>
          <path d="M0 ${y - 5}H10L5 ${y}L0 ${y - 5}Z" fill="#C5CCD0"/>
        </svg>`;
      } else {
        arrowElement.parentNode.style.left =
          this.blocks.filter((id) => id.id == children.parent)[0].x -
          20 -
          (this.absX + window.scrollX) +
          this.canvasDiv.getBoundingClientRect().left +
          "px";
        arrowElement.parentNode.innerHTML = `<input type="hidden" class="arrowid" value="${
          children.id
        }">
        <svg preserveaspectratio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 0L20 ${this.paddingY / 2}L${x} ${
          this.paddingY / 2
        }L${x} ${y}" stroke="#C5CCD0" stroke-width="2px"/>
          <path d="M${x - 5} ${y - 5}H${x + 5}L${x} ${y}L${x - 5} ${
          y - 5
        }Z" fill="#C5CCD0"/>
        </svg>`;
      }
    }
  }

  snap(drag: HTMLElement, i: number, blocko: Array<number>): void {
    if (!this.rearrange) {
      this.canvasDiv.appendChild(drag);
    }
    let totalwidth = 0;
    let totalremove = 0;
    const parentBlocks = this.blocks.filter((id) => id.parent === blocko[i]);

    for (let w = 0; w < parentBlocks.length; w++) {
      const children = parentBlocks[w];
      if (children.childwidth > children.width) {
        totalwidth += children.childwidth + this.paddingX;
      } else {
        totalwidth += children.width + this.paddingX;
      }
    }

    totalwidth += parseInt(window.getComputedStyle(drag).width);

    for (let w = 0; w < parentBlocks.length; w++) {
      const children = parentBlocks[w];
      const grandparentBlock = this.blocks.filter((a) => a.id === blocko[i])[0];
      const block = document.querySelector(`.blockid[value='${children.id}']`);

      if (children.childwidth > children.width) {
        if (block !== null && block.parentNode !== null) {
          const parentNode = block.parentNode as HTMLElement;
          parentNode.style.left =
            grandparentBlock.x -
            totalwidth / 2 +
            totalremove +
            children.childwidth / 2 -
            children.width / 2 +
            "px";
        }
        children.x =
          grandparentBlock.x -
          totalwidth / 2 +
          totalremove +
          children.childwidth / 2;
        totalremove += children.childwidth + this.paddingX;
      } else {
        if (block !== null && block.parentNode !== null) {
          const parentNode = block.parentNode as HTMLElement;
          parentNode.style.left =
            grandparentBlock.x - totalwidth / 2 + totalremove + "px";
        }
        children.x =
          grandparentBlock.x -
          totalwidth / 2 +
          totalremove +
          children.width / 2;
        totalremove += children.width + this.paddingX;
      }
    }

    const targetBlock = this.blocks.filter((id) => id.id === blocko[i])[0];

    drag.style.left =
      targetBlock.x -
      totalwidth / 2 +
      totalremove -
      (window.scrollX + this.absX) +
      this.canvasDiv.scrollLeft +
      this.canvasDiv.getBoundingClientRect().left +
      "px";
    drag.style.top =
      targetBlock.y +
      targetBlock.height / 2 +
      this.paddingY -
      (window.scrollY + this.absY) +
      this.canvasDiv.getBoundingClientRect().top +
      "px";

    const block = drag.querySelector(".blockid") as HTMLInputElement;
    const blockID = block ? parseInt(block.value) : NaN;

    if (this.rearrange && this.drag) {
      const blockTemp = this.tempBlocks.filter((a) => a.id === blockID)[0];

      blockTemp.x =
        drag.getBoundingClientRect().left +
        window.scrollX +
        parseInt(window.getComputedStyle(drag).width) / 2 +
        this.canvasDiv.scrollLeft -
        this.canvasDiv.getBoundingClientRect().left;
      blockTemp.y =
        drag.getBoundingClientRect().top +
        window.scrollY +
        parseInt(window.getComputedStyle(drag).height) / 2 +
        this.canvasDiv.scrollTop -
        this.canvasDiv.getBoundingClientRect().top;
      blockTemp.parent = blocko[i];

      for (let w = 0; w < this.tempBlocks.length; w++) {
        if (this.tempBlocks[w].id !== blockID) {
          const blockParent = (
            document.querySelector(
              `.blockid[value='${this.tempBlocks[w].id}']`
            ) as HTMLInputElement
          )?.parentNode as HTMLElement;
          const arrowParent = (
            document.querySelector(
              `.arrowid[value='${this.tempBlocks[w].id}']`
            ) as HTMLInputElement
          )?.parentNode as HTMLElement;

          if (blockParent) {
            blockParent.style.left =
              blockParent.getBoundingClientRect().left +
              window.scrollX -
              (window.scrollX + this.canvasDiv.getBoundingClientRect().left) +
              this.canvasDiv.scrollLeft +
              "px";
            blockParent.style.top =
              blockParent.getBoundingClientRect().top +
              window.scrollY -
              (window.scrollY + this.canvasDiv.getBoundingClientRect().top) +
              this.canvasDiv.scrollTop +
              "px";
          }

          arrowParent.style.left =
            arrowParent.getBoundingClientRect().left +
            window.scrollX -
            (window.scrollX + this.canvasDiv.getBoundingClientRect().left) +
            this.canvasDiv.scrollLeft +
            20 +
            "px";
          arrowParent.style.top =
            arrowParent.getBoundingClientRect().top +
            window.scrollY -
            (window.scrollY + this.canvasDiv.getBoundingClientRect().top) +
            this.canvasDiv.scrollTop +
            "px";
          this.canvasDiv.appendChild(blockParent);
          this.canvasDiv.appendChild(arrowParent);

          this.tempBlocks[w].x =
            blockParent.getBoundingClientRect().left +
            window.scrollX +
            parseInt(window.getComputedStyle(blockParent).width) / 2 +
            this.canvasDiv.scrollLeft -
            this.canvasDiv.getBoundingClientRect().left;
          this.tempBlocks[w].y =
            blockParent.getBoundingClientRect().top +
            window.scrollY +
            parseInt(window.getComputedStyle(blockParent).height) / 2 +
            this.canvasDiv.scrollTop -
            this.canvasDiv.getBoundingClientRect().top;
        }
      }
      this.blocks = this.blocks.concat(this.tempBlocks);
      this.tempBlocks = [];
    } else {
      const rect = drag.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(drag);

      const newBlock: Block = {
        childwidth: 0,
        parent: blocko[i],
        id: blockID,
        x:
          rect.left +
          window.scrollX +
          parseInt(computedStyle.width) / 2 +
          this.canvasDiv.scrollLeft -
          this.canvasDiv.getBoundingClientRect().left,
        y:
          rect.top +
          window.scrollY +
          parseInt(computedStyle.height) / 2 +
          this.canvasDiv.scrollTop -
          this.canvasDiv.getBoundingClientRect().top,
        width: parseInt(computedStyle.width),
        height: parseInt(computedStyle.height),
      };

      this.blocks.push(newBlock);
    }

    const arrowblock = this.blocks.filter((a) => a.id === blockID)[0];
    const arrowx = arrowblock.x - targetBlock.x + 20;
    const arrowy = this.paddingY;
    this.drawArrow(arrowblock, arrowx, arrowy, blocko[i]);

    if (targetBlock.parent !== -1) {
      let flag = false;
      let idval = blocko[i];
      while (!flag) {
        if (this.blocks.filter((a) => a.id === idval)[0].parent === -1) {
          flag = true;
        } else {
          let zwidth = 0;
          const idvalBlocks = this.blocks.filter((id) => id.parent === idval);

          for (let w = 0; w < idvalBlocks.length; w++) {
            const children = idvalBlocks[w];
            if (children.childwidth > children.width) {
              if (w === idvalBlocks.length - 1) {
                zwidth += children.childwidth;
              } else {
                zwidth += children.childwidth + this.paddingX;
              }
            } else {
              if (w === idvalBlocks.length - 1) {
                zwidth += children.width;
              } else {
                zwidth += children.width + this.paddingX;
              }
            }
          }
          this.blocks.filter((a) => a.id === idval)[0].childwidth = zwidth;
          idval = this.blocks.filter((a) => a.id === idval)[0].parent;
        }
      }
      this.blocks.filter((id) => id.id === idval)[0].childwidth = totalwidth;
    }

    if (this.rearrange) {
      this.rearrange = false;
      drag.classList.remove("dragging");
    }
    this.rearrangeMe();
    this.checkOffset();
  }

  touchblock(event: MouseEvent | TouchEvent): void {
    this.dragblock = false;
    const targetElement = event.target as HTMLElement;

    if (this.hasParentClass(targetElement, "block")) {
      const theblock = targetElement.closest(".block") as HTMLElement;
      let mouse_x: number;
      let mouseY: number;

      if ("targetTouches" in event) {
        mouse_x = (event as TouchEvent).targetTouches[0].clientX;
        mouseY = (event as TouchEvent).targetTouches[0].clientY;
      } else {
        mouse_x = (event as MouseEvent).clientX;
        mouseY = (event as MouseEvent).clientY;
      }

      if (
        event.type !== "mouseup" &&
        this.hasParentClass(targetElement, "block")
      ) {
        if ("which" in event && (event as MouseEvent).which !== 3) {
          if (!this.active && !this.rearrange) {
            this.dragblock = true;
            this.drag = theblock;
            this.dragX =
              mouse_x -
              (this.drag.getBoundingClientRect().left + window.scrollX);
            this.dragY =
              mouseY - (this.drag.getBoundingClientRect().top + window.scrollY);
          }
        }
      }
    }
  }

  hasParentClass(element: HTMLElement, classname: string): boolean {
    if (element.className) {
      if (element.className.split(" ").indexOf(classname) >= 0) return true;
    }

    return (
      element.parentNode instanceof HTMLElement &&
      this.hasParentClass(element.parentNode, classname)
    );
  }

  moveBlock(event: MouseEvent | TouchEvent): void {
    let mouseX: number;
    let mouseY: number;

    if ("targetTouches" in event) {
      mouseX = event.targetTouches[0].clientX;
      mouseY = event.targetTouches[0].clientY;
    } else {
      mouseX = event.clientX;
      mouseY = event.clientY;
    }

    if (this.dragblock && this.drag) {
      this.rearrange = true;
      this.drag?.classList.add("dragging");
      const block = this.drag.querySelector(
        ".blockid"
      ) as HTMLInputElement | null;
      const blockID = block ? parseInt(block.value) : null;
      this.prevblock = this.blocks.filter((a) => a.id === blockID)[0].parent;
      this.tempBlocks.push(this.blocks.filter((a) => a.id === blockID)[0]);
      this.blocks = this.blocks.filter((e) => e.id !== blockID);

      if (blockID !== 0) {
        const arrowIdElement = document.querySelector(
          `.arrowid[value='${blockID}']`
        );
        if (arrowIdElement !== null) {
          const parentNode = arrowIdElement.parentNode;
          if (parentNode) {
            parentNode.removeChild(arrowIdElement);
          }
        }
      }

      let layer = this.blocks.filter((a) => a.parent === blockID);
      let flag = false;
      let foundids: number[] = [];
      let allids: number[] = [];

      while (!flag) {
        for (let i = 0; i < layer.length; i++) {
          if (layer[i].id !== blockID) {
            this.tempBlocks.push(
              this.blocks.filter((a) => a.id === layer[i].id)[0]
            );
            const blockElement = document.querySelector(
              `.blockid[value='${layer[i].id}']`
            ) as HTMLElement | null;
            const blockParent = blockElement?.parentNode as HTMLElement;
            const arrowElement = document.querySelector(
              `.arrowid[value='${layer[i].id}']`
            );
            const arrowParent = arrowElement?.parentNode as HTMLElement;

            if (blockParent) {
              blockParent.style.left = `${
                blockParent.getBoundingClientRect().left +
                window.scrollX -
                (this.drag.getBoundingClientRect().left + window.scrollX)
              }px`;
              blockParent.style.top = `${
                blockParent.getBoundingClientRect().top +
                window.scrollY -
                (this.drag.getBoundingClientRect().top + window.scrollY)
              }px`;
              this.drag.appendChild(blockParent);
            }
            arrowParent.style.left = `${
              arrowParent.getBoundingClientRect().left +
              window.scrollX -
              (this.drag.getBoundingClientRect().left + window.scrollX)
            }px`;
            arrowParent.style.top = `${
              arrowParent.getBoundingClientRect().top +
              window.scrollY -
              (this.drag.getBoundingClientRect().top + window.scrollY)
            }px`;
            this.drag.appendChild(arrowParent);
            foundids.push(layer[i].id);
            allids.push(layer[i].id);
          }
        }
        if (foundids.length === 0) {
          flag = true;
        } else {
          layer = this.blocks.filter((a) => foundids.includes(a.parent));
          foundids = [];
        }
      }

      for (
        let i = 0;
        i < this.blocks.filter((a) => a.parent === blockID).length;
        i++
      ) {
        const blocknumber = this.blocks.filter((a) => a.parent === blockID)[i];
        this.blocks = this.blocks.filter((e) => e.id !== blocknumber.id);
      }

      for (let i = 0; i < allids.length; i++) {
        const blocknumber = allids[i];
        this.blocks = this.blocks.filter((e) => e.id !== blocknumber);
      }

      if (this.blocks.length > 1) {
        this.rearrangeMe();
      }

      this.dragblock = false;
    }

    if (this.active && this.drag) {
      this.drag.style.left = this.dragX
        ? `${mouseX - this.dragX}px`
        : `${mouseX}px`;
      this.drag.style.top = this.dragY
        ? `${mouseY - this.dragY}px`
        : `${mouseY}px`;
    } else if (this.rearrange && this.drag) {
      this.drag.style.left = this.dragX
        ? `${
            mouseX -
            this.dragX -
            (window.scrollX + this.absX) +
            this.canvasDiv.scrollLeft
          }px`
        : `${
            mouseX - (window.scrollX + this.absX) + this.canvasDiv.scrollLeft
          }px`;
      this.drag.style.top = this.dragY
        ? `${
            mouseY -
            this.dragY -
            (window.scrollY + this.absY) +
            this.canvasDiv.scrollTop
          }px`
        : `${
            mouseY - (window.scrollY + this.absY) + this.canvasDiv.scrollTop
          }px`;
      const block = this.drag.querySelector(".blockid") as HTMLInputElement;
      const blockID = block ? parseInt(block.value) : NaN;
      const dragBlock = this.tempBlocks.find((a) => a.id === blockID);
      if (dragBlock) {
        dragBlock.x =
          this.drag.getBoundingClientRect().left +
          window.scrollX +
          parseInt(window.getComputedStyle(this.drag).width) / 2 +
          this.canvasDiv.scrollLeft;
        dragBlock.y =
          this.drag.getBoundingClientRect().top +
          window.scrollY +
          parseInt(window.getComputedStyle(this.drag).height) / 2 +
          this.canvasDiv.scrollTop;
      }
    }

    if (
      (this.active || this.rearrange) &&
      this.mouseX &&
      this.mouseY &&
      this.dragX &&
      this.dragY
    ) {
      if (this.active && this.drag) {
        this.drag.style.left = `${this.mouseX - this.dragX}px`;
        this.drag.style.top = `${this.mouseY - this.dragY}px`;
      } else if (this.rearrange && this.drag) {
        this.drag.style.left = `${
          this.mouseX -
          this.dragX -
          (window.scrollX + this.absX) +
          this.canvasDiv.scrollLeft
        }px`;
        this.drag.style.top = `${
          this.mouseY -
          this.dragY -
          (window.scrollY + this.absY) +
          this.canvasDiv.scrollTop
        }px`;
        const block = this.drag.querySelector(".blockid") as HTMLInputElement;
        const blockID = block ? parseInt(block.value) : NaN;
        const dragBlock = this.tempBlocks.find((a) => a.id === blockID);
        if (dragBlock) {
          dragBlock.x =
            this.drag.getBoundingClientRect().left +
            window.scrollX +
            parseInt(window.getComputedStyle(this.drag).width) / 2 +
            this.canvasDiv.scrollLeft;
          dragBlock.y =
            this.drag.getBoundingClientRect().top +
            window.scrollY +
            parseInt(window.getComputedStyle(this.drag).height) / 2 +
            this.canvasDiv.scrollTop;
        }
      }

      if (this.mouseX && this.mouseY) {
        if (
          this.mouseX >
            this.canvasDiv.getBoundingClientRect().width +
              this.canvasDiv.getBoundingClientRect().left -
              10 &&
          this.mouseX <
            this.canvasDiv.getBoundingClientRect().width +
              this.canvasDiv.getBoundingClientRect().left +
              10
        ) {
          this.canvasDiv.scrollLeft += 10;
        } else if (
          this.mouseX < this.canvasDiv.getBoundingClientRect().left + 10 &&
          this.mouseX > this.canvasDiv.getBoundingClientRect().left - 10
        ) {
          this.canvasDiv.scrollLeft -= 10;
        } else if (
          this.mouseY >
            this.canvasDiv.getBoundingClientRect().height +
              this.canvasDiv.getBoundingClientRect().top -
              10 &&
          this.mouseY <
            this.canvasDiv.getBoundingClientRect().height +
              this.canvasDiv.getBoundingClientRect().top +
              10
        ) {
          this.canvasDiv.scrollTop += 10;
        } else if (
          this.mouseY < this.canvasDiv.getBoundingClientRect().top + 10 &&
          this.mouseY > this.canvasDiv.getBoundingClientRect().top - 10
        ) {
          this.canvasDiv.scrollLeft -= 10;
        }
      }

      if (this.drag) {
        const xpos =
          this.drag.getBoundingClientRect().left +
          window.scrollX +
          parseInt(window.getComputedStyle(this.drag).width) / 2 +
          this.canvasDiv.scrollLeft -
          this.canvasDiv.getBoundingClientRect().left;
        const ypos =
          this.drag.getBoundingClientRect().top +
          window.scrollY +
          this.canvasDiv.scrollTop -
          this.canvasDiv.getBoundingClientRect().top;
      }
      const blocko = this.blocks.map((a) => a.id);

      for (let i = 0; i < this.blocks.length; i++) {
        if (this.checkAttach(blocko[i])) {
          const indicator = document.querySelector(".indicator") as HTMLElement;
          document
            .querySelector(`.blockid[value='${blocko[i]}']`)
            ?.parentNode?.appendChild(indicator);

          indicator.style.left = `${
            (
              document.querySelector(`.blockid[value='${blocko[i]}']`)
                ?.parentNode as HTMLElement
            )?.offsetWidth! /
              2 -
            5
          }px`;
          indicator.style.top = `${(
            document.querySelector(`.blockid[value='${blocko[i]}']`)
              ?.parentNode as HTMLElement
          )?.offsetHeight!}px`;
          indicator.classList.remove("invisible");
          break;
        } else if (i === this.blocks.length - 1) {
          const indicator = document.querySelector(".indicator") as HTMLElement;
          if (!indicator.classList.contains("invisible")) {
            indicator.classList.add("invisible");
          }
        }
      }
    }
  }

  checkOffset(): void {
    this.offsetleftX = this.blocks.map((a) => a.x);
    const widths = this.blocks.map((a) => a.width);
    const mathmin = this.offsetleftX.map(function (item, index) {
      return item - widths[index] / 2;
    });
    const offsetleft = Math.min.apply(Math, mathmin);

    if (
      offsetleft <
      this.canvasDiv.getBoundingClientRect().left + window.scrollX - this.absX
    ) {
      const blocko = this.blocks.map((a) => a.id);

      for (let w = 0; w < this.blocks.length; w++) {
        const block = document.querySelector(
          ".blockid[value='" +
            this.blocks.filter((a) => a.id === blocko[w])[0].id +
            "']"
        );
        const parentNode = block ? (block.parentNode as HTMLElement) : null;
        if (parentNode) {
          parentNode.style.left = `${
            this.blocks.filter((a) => a.id === blocko[w])[0].x -
            this.blocks.filter((a) => a.id === blocko[w])[0].width / 2 -
            offsetleft +
            this.canvasDiv.getBoundingClientRect().left -
            this.absX +
            20
          }px`;
        }

        if (this.blocks.filter((a) => a.id === blocko[w])[0].parent !== -1) {
          const arrowblock = this.blocks.filter((a) => a.id === blocko[w])[0];
          const arrowx =
            arrowblock.x -
            this.blocks.filter(
              (a) =>
                a.id === this.blocks.filter((a) => a.id === blocko[w])[0].parent
            )[0].x;

          if (arrowx < 0) {
            const arrowBlock = document.querySelector(
              '.arrowid[value="' + blocko[w] + '"]'
            );
            const parentNode = arrowBlock
              ? (arrowBlock.parentNode as HTMLElement)
              : null;
            if (parentNode) {
              parentNode.style.left = `${
                arrowblock.x -
                offsetleft +
                20 -
                5 +
                this.canvasDiv.getBoundingClientRect().left -
                this.absX
              }px`;
            }
          } else {
            const block = document.querySelector(
              '.arrowid[value="' + blocko[w] + '"]'
            );
            const parentNode = block ? (block.parentNode as HTMLElement) : null;
            if (parentNode) {
              parentNode.style.left = `${
                this.blocks.filter(
                  (id) =>
                    id.id ===
                    this.blocks.filter((a) => a.id === blocko[w])[0].parent
                )[0].x -
                20 -
                offsetleft +
                this.canvasDiv.getBoundingClientRect().left -
                this.absX +
                20
              }px`;
            }
          }
        }
      }

      for (let w = 0; w < this.blocks.length; w++) {
        const block = document.querySelector(
          ".blockid[value='" + this.blocks[w].id + "']"
        );
        const parentNode = block ? (block.parentNode as HTMLElement) : null;

        if (parentNode) {
          this.blocks[w].x =
            parentNode.getBoundingClientRect().left +
            window.scrollX +
            this.canvasDiv.scrollLeft +
            parseInt(window.getComputedStyle(parentNode).width) / 2 -
            20 -
            this.canvasDiv.getBoundingClientRect().left;
        }
      }
    }
  }

  rearrangeMe(): void {
    for (let z = 0; z < this.blocks.length; z++) {
      const paddingx = 40;
      const paddingy = 100;
      const parentBlocks = this.blocks.filter(
        (id) => id.parent === this.blocks[z].parent
      );
      const result = parentBlocks.map((a) => a.parent);

      if (result[z] === -1) {
        z++;
        continue;
      }

      let totalwidth = parentBlocks.reduce((total, children) => {
        if (
          this.blocks.filter((id) => id.parent === children.id).length === 0
        ) {
          children.childwidth = 0;
        }
        return (
          total +
          (children.childwidth > children.width
            ? children.childwidth
            : children.width) +
          paddingx
        );
      }, 0);

      if (result[z] !== -1) {
        this.blocks.filter((a) => a.id === result[z])[0].childwidth =
          totalwidth;
      }

      let totalremove = 0;
      parentBlocks.forEach((children) => {
        const block = document.querySelector(
          `.blockid[value="${children.id}"]`
        );
        const r_block = block ? (block.parentNode as HTMLElement) : null;
        const r_array = this.blocks.filter((id) => id.id === result[z])[0];
        if (r_block) {
          r_block.style.top = `${
            r_array.y +
            paddingy +
            this.canvasDiv.getBoundingClientRect().top -
            this.absY
          }px`;
          r_array.y = r_array.y + paddingy;
          const calcWidth =
            children.childwidth > children.width
              ? children.childwidth
              : children.width;
          r_block.style.left = `${
            r_array.x -
            totalwidth / 2 +
            totalremove +
            calcWidth / 2 -
            children.width / 2 -
            (this.absX + window.scrollX) +
            this.canvasDiv.getBoundingClientRect().left
          }px`;

          children.x = r_array.x - totalwidth / 2 + totalremove + calcWidth / 2;
          totalremove += calcWidth + paddingx;
        }

        const arrowblock = this.blocks.filter((a) => a.id === children.id)[0];
        const arrowx =
          arrowblock.x -
          this.blocks.filter((a) => a.id === children.parent)[0].x +
          20;
        const arrowy = paddingy;
        this.updateArrow(arrowblock, arrowx, arrowy, children);
      });
    }
  }

  blockReleased(): void {
    this.release();
  }

  blockSnap(
    drag: HTMLElement,
    first: boolean,
    parent: HTMLElement | null
  ): boolean {
    return this.snapping(drag, first, parent);
  }

  beforeDelete(drag: HTMLElement, parent: Block): boolean {
    return this.rearrange; // need to call rearrange method
  }

  addEventListenerMulti(
    type: string,
    listener: EventListenerOrEventListenerObject,
    capture: boolean,
    selector: string
  ): void {
    const nodes = document.querySelectorAll(selector);
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].addEventListener(type, listener, capture);
    }
  }

  removeEventListenerMulti(
    type: string,
    listener: EventListenerOrEventListenerObject,
    capture: boolean,
    selector: string
  ): void {
    const nodes = document.querySelectorAll(selector);
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].removeEventListener(type, listener, capture);
    }
  }
}

export default Flowy;
