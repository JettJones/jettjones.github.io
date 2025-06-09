var canvas = document.getElementById("image");
var byte_view = document.getElementById("bytes");
var notes_view = document.getElementById("notes");

var inctx = canvas.getContext('2d', { alpha: false});


function load_image(img) {
    var x, y;
    if (img.naturalHeight > img.naturalWidth) {
        var ratio = img.naturalWidth / img.naturalHeight;
        y = 500;
        x = Math.floor(ratio * y);
    } else {
        var ratio = img.naturalHeight / img.naturalWidth;
        x = 500;
        y = Math.floor(ratio * x);
    }
    canvas.width = x;
    canvas.height = y;
    inctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

// create the image
var img = new Image();
img.onload = function() {
    load_image(img);
}
img.src = "test.jpg";

function to_image(event){
    event.target.href = output.toDataURL();
}


class HuffTable {
    constructor(lengths, elements) {
        this.root = []
        this.setup(lengths, elements);
    }

    setup(lengths, elements) {
        var el_ix = 0;
        for (var i = 0; i < lengths.length; i++) {
            if (lengths[i] == 0) {
                continue;
            }
            // Note that elements is only set when lengths > 0
            // So we keep a seperate index for elements, el_ix
            let elements_for_length = elements[el_ix];
            for (var j=0; j < lengths[i]; j++) {
                let el_j = elements_for_length[j];
                this.bits_from_length(this.root, el_j, i);
            }
            el_ix += 1;
        }
    }
    
    bits_from_length(root, element, pos) {
        if (!(root instanceof Array)) {
            // this spot is already filled
            // this is not an efficient method of building the tree
            // since we check every previous element when we add a new one...
            return false;
        }
        // pos=0 indicates we want to add an element at the current depth.
        if (pos == 0) {
            if (root.length < 2) {
                root.push(element);
                return true;
            }
            // current element is already full
            return false;
        }
        // pos > 0 indicates we want to add an element at a deeper depth.
        for (var i = 0; i < 2; i++) {
            if (root.length == i) {
                root.push([]);
            }
            if (this.bits_from_length(root[i], element, pos-1)) {
                return true;
            }
        }
        // after the for loop, deeper elements are also full
        return false;
    }

    _find(stream) {
        var key = ""
        var r = this.root;
        while (r instanceof Array) {
            let _bit = stream.get_bit();
            key += _bit;
            r = r[_bit];
        }
        if (isNaN(r)) {
            console.log("Error finding key,", key)
        }
        return r;
    }

    get_code(stream) {
        // the lookup method
        while (true) {
            var res = this._find(stream);
            if (res == 0) {
                // this is the same as the next result
                return 0;
            } else if (res != -1) {
                // no code sets res to -1, so that's strange.
                return res;
            }
            console.log("unexpected while loop")
        }
    }
}

class BitStream {
    constructor(data) {
        this.data = data;
        this.pos = 0;
    }
    
    get_bit() {
        // tracking next bit by position (which counts to len * 8)
        var byte = this.data[this.pos >> 3];
        // 0 => 7, 1 => 6 ... 6 => 1, 7 => 0
        var s = 7 - (this.pos & 0x7); // & 0x7 is the same as modulo% 8
        this.pos += 1;
        return (byte >> s) & 1;
    }

    bit_n(len) {
        // read a number of bits together. (if len is large enough this will overflow an output int)
        // in practice we want to read until we match a huffman table token.
        var val = 0;
        for (var i = 0; i < len; i++) {
            val = val*2 + this.get_bit();
        }
        return val;
    }
}

class ImgStream {
    constructor(imgState) {
        this.imgState = imgState;
        this.bitOffset = -1;
        this.byte = 0;
        this.prevByte = 0;
    }

    get_bit() {
        this.bitOffset = (this.bitOffset + 1) % 8;

        if (this.bitOffset == 0) {
            this.prevByte = this.byte;
            this.byte = this.imgState.read(1);

            // special case - remove padding
            if (this.prevByte == 0xFF  && this.byte == 0x00) {
                this.prevByte = this.byte;
                this.byte = this.imgState.read(1);
            }
        }

        return (this.byte >> (7 - this.bitOffset)) & 0x1;
    }

    bit_n(len) {
        var val = 0;
        for (var i = 0; i < len; i++) {
            val = val*2 + this.get_bit();
        }
        return val;
    }

    debug() {
        return this.imgState.debug();
    }
}

function _decode_number(code, bits) {
    // handle encoding of negative numbers
    let range = 2 ** (code - 1);
    if (bits >= range)
        return bits
    else
        return bits - (2*range - 1)
}

function _build_matrix(imgStream, dc_huff, ac_huff) {
    // haxin
    old_dc_coeff = 0;

    // extract huffman code from the stream
    code = dc_huff.get_code(imgStream);
    bits = imgStream.bit_n(code);

    dc_coeff = _decode_number(code, bits) + old_dc_coeff;
    if (isNaN(dc_coeff)) {
        console.log(imgStream.debug())
        throw new Exception("wat")
    }

    // what we're building is an 8x8 matrix
    // which would normally be multiplied by the quantization table, and
    // run through inverse-discreet-cosine transform
    // for now... just extract and decode values
    all_coeff = [dc_coeff];
    while (all_coeff.length < 64) {
        code = ac_huff.get_code(imgStream);
        if (code == 0) {
            break;
        }

        //
        // The first part of the AC key_len
        // is the number of leading zeros
        //
        if (code > 15) {
            blanks = code >> 4;
            for (i=0; i <blanks; i++) {
                all_coeff.push(0)
            }
            code = code & 0x0F;
        }

        bits = imgStream.bit_n(code);

        if (all_coeff.length < 64) {
            coeff = _decode_number(code, bits);
            all_coeff.push(coeff);
        }
    }
    
    // console.log("DC: ", dc_coeff, "AC: ", ac_coeff.length, ac_coeff)

    return all_coeff;
}

function read_image_data(imgState) {
    // 1. divide into 8x8 blocks
    // within each block
    // 1. read the DC value
    // 2. read up to 64 AC values
    let imgStream = new ImgStream(imgState);
    console.log("reading image data...")

    let y_dc = imgState.huffmans[0];
    let y_ac = imgState.huffmans[1];
    let cx_dc = imgState.huffmans[2];
    let cx_ac = imgState.huffmans[3];

    // stride considerations
    // block size is 8x8, but subsampling can be up to 4x that
    let components = imgState.components;

    if (components.length != 3) {
        throw new NotImplementedError("Only YCbCr is supported")
    }

    y_h = components[0][1] >> 4;
    y_v = components[0][1] & 0xF;

    cb_h = components[1][1] >> 4;
    cb_v = components[1][1] & 0xF;

    cr_h = components[2][1] >> 4;
    cr_v = components[2][1] & 0xF;

    ystep = 8 * Math.max(y_v, cb_v, cr_v);
    xstep = 8 * Math.max(y_h, cb_h, cr_h);

    for (var y = 0; (y * ystep) < imgState.height; y++) {
        for (var x = 0; (x * xstep) < imgState.width; x++) {

            let yc = [], cr = [], cb = [];
            for (var i = 0; i < (y_h * y_v); i++) {
                yc.push(_build_matrix(imgStream, y_dc, y_ac));
            }

            for (var i = 0; i < (cb_h * cb_v); i++) {
                cr.push(_build_matrix(imgStream, cx_dc, cx_ac));
            }
            
            for (var i = 0; i < (cr_h * cr_v); i++) {
                cb.push(_build_matrix(imgStream, cx_dc, cx_ac));
            }

            if (y == 0) {
                console.log("for ", y, x, yc, cr, cb)
            }
            // DrawMatrix(x, y, matL.base, matCb.base, matCr.base)
        }
    }
}

//
// Handlers for various section types
//

function DHT(imgState){
    header = imgState.readLength();

    // one byte header
    dht_class = imgState.read(1);
    // Extract the 16 bytes containing length data
    lengths = imgState.read(16);

    // Extract the elements after the initial 16 bytes
    elements = []
    for(var i = 0; i < lengths.length; i++) {
        if (lengths[i] == 0) {
            continue; 
        }

        var ll = lengths[i];
        elements.push(imgState.read(ll));
    }

    let ht = new HuffTable(lengths, elements);
    console.log("hufftable: ", hexPair(dht_class), "lengths: ", lengths);
    // console.log("Elements: ", elements);

    imgState.storeHuffman(dht_class, ht)
    return ht;
}

function DQT(imgState){
    len = imgState.readLength();
    hdr = imgState.read(1);
    console.log("DQT header: ", hexPair(hdr));
    body = imgState.read(len - 3);
    console.log("DQT body: ", body);
    return [hdr, body]
}

function COM(imgState){
    len = imgState.readLength();
    body = imgState.read(len - 2);
    console.log("Comment:" + body);
}

function StartFrame(imgState) {
    // metadata about the image
    len = imgState.readLength();
    precision = imgState.read(1);
    height = imgState.readLength();
    width = imgState.readLength();
    comp_count = imgState.read(1);
    components = [];
    for (var i = 0; i < comp_count; i++) {
        components.push(imgState.read(3));
    }

    if (len != 8 + 3 * comp_count) {
        console.log("Error: Start of Frame length is incorrect.");
    }
    console.log("Start of Frame: ", precision, height, width, comp_count, components);

    // components describes how many of each component to read per block
    for (var i = 0; i < comp_count; i++) {
        comp_h = components[i][1] >> 4;
        comp_v = components[i][1] & 0xF;
        console.log("Component: ", components[i][0], comp_h, comp_v);
    }

    imgState.storeFrame(height, width, components);

    return [height, width]
}

function StartOfScan(imgState) {
    len = imgState.readLength();
    console.log("Start of scan, length: ", len)
    imgState.read(len - 2);
}

function Skip(imgState){
    len = imgState.readLength();
    imgState.read(len - 2);
}

class ImageState {
    constructor(byteArray) {
        this.byteArray = byteArray;
        this.byteIdx = 0;
        this.huffmans = [];
        this.dqt = {};
        this.height = 0;
        this.width = 0;
        this.components = [];
    }

    read(nBytes) {
        const result = this.byteArray.slice(this.byteIdx, this.byteIdx + nBytes);
        this.byteIdx += nBytes;
        return result;
    }

    readLength() {
        return (this.read(1) << 8) | this.read(1);
    }

    isDone() {
        return this.byteIdx >= this.byteArray.length;
    }

    storeHuffman(dht_class, huffTable) {
        // not sure how to store
        // seems we'll have four Y-DC, Y-AC, C*-DC, C*-AC
        // assume they're always in order?
        this.huffmans.push(huffTable);
    }

    storeDQT(hdr, body) {
        this.dqt[hdr] = body;
    }

    storeFrame(height, width, components) {
        this.height = height;
        this.width = width;
        this.components = components;
    }

    debug() {
        // last 4 bytes
        let prev = this.byteArray.slice(this.byteIdx-4, this.byteIdx);
        let nxt = this.byteArray.slice(this.byteIdx, this.byteIdx+4);
        return [prev, nxt];
    }
}

// from python PIL
MARKER = {
    0xFFC0: ["SOF0", "Baseline DCT", StartFrame],
    0xFFC1: ["SOF1", "Extended Sequential DCT", Skip],
    0xFFC2: ["SOF2", "Progressive DCT", Skip],
    0xFFC3: ["SOF3", "Spatial lossless", Skip],
    0xFFC4: ["DHT", "Define Huffman table", DHT],
    // ^^ Huffman table is the good stuff.
    0xFFC5: ["SOF5", "Differential sequential DCT", Skip],
    0xFFC6: ["SOF6", "Differential progressive DCT", Skip],
    0xFFC7: ["SOF7", "Differential spatial", Skip],
    0xFFC8: ["JPG", "Extension", null],
    0xFFC9: ["SOF9", "Extended sequential DCT (AC)", Skip],
    0xFFCA: ["SOF10", "Progressive DCT (AC)", Skip],
    0xFFCB: ["SOF11", "Spatial lossless DCT (AC)", Skip],
    0xFFCC: ["DAC", "Define arithmetic coding conditioning", Skip],
    0xFFCD: ["SOF13", "Differential sequential DCT (AC)", Skip],
    0xFFCE: ["SOF14", "Differential progressive DCT (AC)", Skip],
    0xFFCF: ["SOF15", "Differential spatial (AC)", Skip],
    0xFFD0: ["RST0", "Restart 0", null],
    0xFFD1: ["RST1", "Restart 1", null],
    0xFFD2: ["RST2", "Restart 2", null],
    0xFFD3: ["RST3", "Restart 3", null],
    0xFFD4: ["RST4", "Restart 4", null],
    0xFFD5: ["RST5", "Restart 5", null],
    0xFFD6: ["RST6", "Restart 6", null],
    0xFFD7: ["RST7", "Restart 7", null],
    0xFFD8: ["SOI", "Start of image", null],
    0xFFD9: ["EOI", "End of image", null],
    0xFFDA: ["SOS", "Start of scan", StartOfScan],
    0xFFDB: ["DQT", "Define quantization table", DQT],
    0xFFDC: ["DNL", "Define number of lines", Skip],
    0xFFDD: ["DRI", "Define restart interval", Skip],
    0xFFDE: ["DHP", "Define hierarchical progression", Skip],
    0xFFDF: ["EXP", "Expand reference component", Skip],
    0xFFE0: ["APP0", "Application segment 0", Skip],
    0xFFE1: ["APP1", "Application segment 1", Skip],
    0xFFE2: ["APP2", "Application segment 2", Skip],
    0xFFE3: ["APP3", "Application segment 3", Skip],
    0xFFE4: ["APP4", "Application segment 4", Skip],
    0xFFE5: ["APP5", "Application segment 5", Skip],
    0xFFE6: ["APP6", "Application segment 6", Skip],
    0xFFE7: ["APP7", "Application segment 7", Skip],
    0xFFE8: ["APP8", "Application segment 8", Skip],
    0xFFE9: ["APP9", "Application segment 9", Skip],
    0xFFEA: ["APP10", "Application segment 10", Skip],
    0xFFEB: ["APP11", "Application segment 11", Skip],
    0xFFEC: ["APP12", "Application segment 12", Skip],
    0xFFED: ["APP13", "Application segment 13", Skip],
    0xFFEE: ["APP14", "Application segment 14", Skip],
    0xFFEF: ["APP15", "Application segment 15", Skip],
    0xFFF0: ["JPG0", "Extension 0", null],
    0xFFF1: ["JPG1", "Extension 1", null],
    0xFFF2: ["JPG2", "Extension 2", null],
    0xFFF3: ["JPG3", "Extension 3", null],
    0xFFF4: ["JPG4", "Extension 4", null],
    0xFFF5: ["JPG5", "Extension 5", null],
    0xFFF6: ["JPG6", "Extension 6", null],
    0xFFF7: ["JPG7", "Extension 7", null],
    0xFFF8: ["JPG8", "Extension 8", null],
    0xFFF9: ["JPG9", "Extension 9", null],
    0xFFFA: ["JPG10", "Extension 10", null],
    0xFFFB: ["JPG11", "Extension 11", null],
    0xFFFC: ["JPG12", "Extension 12", null],
    0xFFFD: ["JPG13", "Extension 13", null],
    0xFFFE: ["COM", "Comment", COM],
}

function parseJPEG(byteArray) {

    let imgState = new ImageState(byteArray);
    head = imgState.read(2);
    if (head[0] !== 0xFF || head[1] !== 0xD8) {
        console.log("Invalid JPEG file: Missing Start-of-Image marker.");
        return;
    }

    let skip = 0;
    while (!imgState.isDone()) {
        // Parse the next section marker
        let top = imgState.read(1);
        if (top == 0xFF) {
            let nxt = imgState.read(1);

            if (nxt == 0) {
                // yup, escaping.
                // FF00 in the scan represents FF in data
                skip += 1;
                continue;
            }

            let value = 0xFF00 | nxt[0];
            let lookup_result = MARKER[value];

            if (value == 0xFFD9) {
                console.log("End of image.  Skip? " + skip);
                break;
            }
            else if (lookup_result == undefined) {
                console.log("Unknown marker: ", top,  nxt);
                skip += 1
                continue;
            }
            else if (skip > 0) {
                console.log("Skipped: ", skip);
                skip = 0;
            }

            console.log("Marker lookup: " + lookup_result[0]);

            // consume all input as no-action 
            if (lookup_result[2] != null) {
                fn = lookup_result[2];
                fn(imgState);
            }

            // if we see start of scan, we can start reading the image
            if (lookup_result[0] == "SOS" ) {
                read_image_data(imgState);
            }
        }
        else {
            skip += 1;
            continue;
        }
    }
}

// image work

function hexPair(oneByte)
{
    // ensure that the byte value is printed as two hex digits
    // by assuming a 0 prefix, and always taking the last two.
    return ("0" + oneByte.toString(16)).slice(-2)
}

function toHexString(byteArray) {

    var result = ''
    const len = byteArray.length;
    for (var i = 0; i < len; i++){
        result += hexPair(byteArray[i]) + " "
    }

    return result;
}



// allow new images

function no_event(e) {
    e.stopPropagation();
    e.preventDefault();
}

function drag_enter(e) {
    no_event(e);
    canvas.style.border = "5px dashed red";
    e.target.opacity = 0.8;
}

function drag_leave(e) {
    no_event(e);
    canvas.style.border = "3px solid black";
}

function drop_event(e) {
    drag_leave(e);

    const supported = ["Files"];
    const types = e.dataTransfer.types.filter(type => supported.includes(type));

    if (types.length) {
        var reader = new FileReader();
        reader.onload = function(evt) {
            var uu = new Uint8Array(evt.target.result);
            byte_view.innerText = toHexString(uu);

            notes = parseJPEG(uu);
            notes_view.innerText = notes;

        };

        reader.readAsArrayBuffer(e.dataTransfer.files[0]);

        // Q: can we load the bytes and also the image? yup
        
        var reader2 = new FileReader();
        reader2.onload = function(evt) {
            var img = new Image();
            img.onload = function() {
                load_image(img);
            };

            img.src = evt.target.result;
        };
        reader2.readAsDataURL(e.dataTransfer.files[0]);
    }
}

var body = document.body;

canvas.ondragenter = drag_enter;
canvas.ondragleave = drag_leave;
canvas.ondragover = no_event;

canvas.addEventListener('drop', drop_event);
