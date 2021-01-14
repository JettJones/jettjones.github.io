var canvas = document.getElementById("image");
var output = document.getElementById("output");
var link = document.getElementById("download");
var button = document.getElementById("redraw");
var lum_button = document.getElementById("luminance");
var edge_button = document.getElementById("edge");

var inctx = canvas.getContext('2d', { alpha: false});
var ctx = output.getContext('2d', { alpha: false});


function DrawContext(_in_pixels, _out_ctx,  _luminance) {
    this.pixels = _in_pixels;
    this.ctx = _out_ctx;
    this.out_pixels = _out_ctx.getImageData(0, 0, _in_pixels.width, _in_pixels.height);
    this.luminance = _luminance;
}

function Settings(_style, _width, _space, _offset) {
    this.style = _style;
    this.width = _width;
    this.space = _space;
    this.offset = _offset;
}

function get_settings() {
    const style = document.getElementById("select_brush");
    const width = document.getElementById("width");
    const space = document.getElementById("space");
    const offset = document.getElementById("offset");

    return new Settings(
        style.value,
        width.valueAsNumber,
        space.valueAsNumber,
        offset.checked);
}

// create the image
var img = new Image();
img.onload = function() {
    inctx.drawImage(img, 0, 0);

    var pixel = inctx.getImageData(0, 0, canvas.width, canvas.height);
    var data = pixel.data;

    var lum = luminance(pixel);

    // first draw, just playing with pixels
    // - shift g -> b -> r
    for (var i = 0; i < data.length; i += 4) {
        var avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = data[i+1];
        data[i + 1] = data[i+2];
        data[i + 2] = avg;
    }
    ctx.putImageData(pixel, 0, 0);
}
img.src = "test.png";

function show_lum() {
    var pixel = inctx.getImageData(0, 0, canvas.width, canvas.height);
    var data = pixel.data;

    const lum = luminance(pixel);
    var l = 0;
    for (var i = 0; i < data.length; i += 4) {
        var avg = lum[l];
        data[i] = avg;
        data[i + 1] = avg;
        data[i + 2] = avg;
        l +=1;
    }

    ctx.putImageData(pixel, 0, 0);
}

function show_edge() {
    var pixel = inctx.getImageData(0, 0, canvas.width, canvas.height);
    var data = pixel.data;
    const w = canvas.width;

    var lum = luminance(pixel);

    // first draw, just playing with pixels
    // - shift g -> b -> r
    var l = 0;
    for (var i = 0; i < data.length; i += 4) {
        var point = [l % w, Math.floor(l / w)];
        var [ang, x, y] = angle(lum, w, point);
        data[i] = 128 + x;
        data[i + 1] = 128 + y;
        data[i + 2] = 128;
        l += 1;
    }

    ctx.putImageData(pixel, 0, 0);
}

function to_image(event){
    event.target.href = output.toDataURL();
}

function get_color(pixels, point) {
    const w = pixels.width;
    const h = pixels.height;

    var data = pixels.data;

    var red = (point[0] + point[1] * w) * 4;
    return [ data[red], data[red + 1], data[red +2]];
}

function set_color(pixels, point, color) {
    const w = pixels.width;
    const red = (point[0] + point[1] * w) * 4;

    var data = pixels.data;
    data[red]     = color[0];
    data[red + 1] = color[1];
    data[red + 2] = color[2];
}

function color_str(color) {
    return 'rgb(' + color.join(",")+ ')';
}

function draw_point(draw_ctx, settings, point, color) {
    var pixels = draw_ctx.out_pixels;
    set_color(pixels, point, color);
}

function draw_circle(draw_ctx, settings, point, color) {
    var ctx = draw_ctx.ctx;
    ctx.fillStyle = color_str(color);
    ctx.beginPath();
    var size = settings.width;
    ctx.ellipse(point[0], point[1], size, size, 0, 0, Math.PI*2);
    ctx.fill();
}

function draw_line(draw_ctx, settings, point, color) {
    var ctx = draw_ctx.ctx;
    var lum_arr = draw_ctx.luminance;
    ctx.strokeStyle = color_str(color);

    ctx.translate(point[0], point[1]);

    var ang = Math.PI * 0.25;
    [ang, _, _] = angle(lum_arr, ctx.canvas.width, point);

    var size = 5;
    ctx.lineWidth = settings.width;

    ctx.rotate(ang);

      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(0, size);
      ctx.stroke();
    ctx.resetTransform();
}

function luminance(pixels) {
    var result = []
    var data = pixels.data;
    for(var i=0; i < pixels.data.length; i += 4) {
        const lum = 0.3 * data[i] + 0.59 * data[i+1] + 0.11 * data[i+2];
        result.push(lum);
    }

    return result;
}

function get_luminance_at(arr, width, point) {
    // wrap values to stay in bounds
    var [x, y] = [Math.abs(point[0]), Math.abs(point[1])];
    if (x > width) { x = width - (x - width);}
    if (y > width) { y = width - (y - width);}

    var ix = x + y * width;
    return arr[ix];
}

function get_lum_arr(lum, width, point) {
    var lum_kernel = [];
    for(var i=-1; i <= 1; i += 1) {
        for (var j=-1; j <= 1; j += 1) {
            var l_ij = get_luminance_at(lum, width, [point[0] + i, point[1] + j]);
            lum_kernel.push(l_ij);
        }
    }
    return lum_kernel;
}

function mul_arr(left, right){
    var result = 0;
    for (var i = 0; i < left.length; i++) {
        result += left[i] * right[i];
    }
    return result;
}

function angle(lum, width, point) {
    var lum_kernel = get_lum_arr(lum, width, point);

    const x_kernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const y_kernel = [1, 2, 1, 0, 0, 0, -1, -2, -1];

    var gX = mul_arr(lum_kernel, x_kernel);
    var gY = mul_arr(lum_kernel, y_kernel);

    var radians =  Math.atan2(gY, gX) + (Math.PI / 2);
    return [radians, gX, gY];
}

function rand_offset(size) {
    var half = size / 2;
    return Math.floor(Math.random() * size - half);
}

function get_draw_fn(style) {
    switch (style) {
    case 'Circle':
        return draw_circle;
    case 'Line':
        return draw_line;
    default:
    case 'Pixel':
        return draw_point;
    }
}

function redraw() {

    ctx.fillStyle = '#eeeeee';
    ctx.fillRect(0,0, canvas.width, canvas.height);

    var settings = get_settings();

    const step = settings.space;
    var pixel = inctx.getImageData(0, 0, canvas.width, canvas.height);

    const lum_arr = luminance(pixel);

    const draw_fn = get_draw_fn(settings.style);
    const draw_ctx = new DrawContext(pixel, ctx, lum_arr);

    for(var y=1; y < pixel.height; y += step) {
        for (var x=0; x < pixel.width; x += step) {
            var point = [x, y];
            if (settings.offset) {
                var ox = rand_offset(2);
                var oy = rand_offset(2);
                point = [x+ox, y+oy];
            }

            var color = get_color(pixel, point);
            draw_fn(draw_ctx, settings, point, color);
        }
    }

    if(settings.style == 'Pixel'){
        ctx.putImageData(draw_ctx.out_pixels, 0, 0);
    }
}

link.addEventListener('click', to_image);
button.addEventListener('click', redraw);
lum_button.addEventListener('click', show_lum);
edge_button.addEventListener('click', show_edge);
