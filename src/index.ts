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
  private el: HTMLDivElement;
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
        childwidth: parseFloat(output.blockarr[i].childwidth),
        parent: parseFloat(output.blockarr[i].parent),
        id: parseFloat(output.blockarr[i].id),
        x: parseFloat(output.blockarr[i].x),
        y: parseFloat(output.blockarr[i].y),
        width: parseFloat(output.blockarr[i].width),
        height: parseFloat(output.blockarr[i].height),
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
    this.blockGrabbed(targetElement);
    this.drag.classList.add("dragging");
    this.active = true;
    this.dragx = clientX - targetElement.getBoundingClientRect().left;
    this.dragy = clientY - targetElement.getBoundingClientRect().top;
    this.drag.style.left = `${clientX - this.dragx}px`;
    this.drag.style.top = `${clientY - this.dragy}px`;
  }
}
