'use strict';
import Color from 'color';
import './m4.js'

const vertSrc = {
  texture: `
    attribute vec4 a_position;

    uniform mat4 u_matrix;
    uniform mat4 u_textureMatrix;

    varying vec2 v_texcoord;

    void main() {
      gl_Position = u_matrix * a_position;
      v_texcoord = (u_textureMatrix * a_position).xy;
    }`,
  color: `
    attribute vec4 a_position;

    uniform mat4 u_matrix;

    void main() {
      gl_Position = u_matrix * a_position;
    }`,
};

const fragSrc = {
  texture: `
    precision mediump float;

    varying vec2 v_texcoord;

    uniform sampler2D u_texture;

    void main() {
      if (v_texcoord.x < 0.0 ||
          v_texcoord.y < 0.0 ||
          v_texcoord.x > 1.0 ||
          v_texcoord.y > 1.0) {
          discard;
      }

      gl_FragColor = texture2D(u_texture, v_texcoord);
    }`,
  color: `
    precision mediump float;

    uniform vec4 u_color;

    void main() {
      gl_FragColor = vec4(u_color.xyz * u_color.a, u_color.a);
    }`,
};

class GLContext2D {
  constructor(gl) {
    const vert = {};
    const frag = {};
    const positions = [
      0, 0, 0, 1,
      1, 0, 1, 0,
      0, 1, 1, 1,
    ];

    this._gl = gl;
    vert.texture = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vert.texture, vertSrc.texture);
    gl.compileShader(vert.texture);
    frag.texture = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(frag.texture, fragSrc.texture);
    gl.compileShader(frag.texture);
    if (!gl.getShaderParameter(vert.texture, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(vert.texture));
    }
    if (!gl.getShaderParameter(frag.texture, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(frag.texture));
    }

    vert.color = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vert.color, vertSrc.color);
    gl.compileShader(vert.color);
    frag.color = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(frag.color, fragSrc.color);
    gl.compileShader(frag.color);
    if (!gl.getShaderParameter(vert.color, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(vert.color));
    }
    if (!gl.getShaderParameter(frag.color, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(frag.color));
    }

    this._program = {};
    this._program.texture = gl.createProgram();
    gl.attachShader(this._program.texture, vert.texture);
    gl.attachShader(this._program.texture, frag.texture);
    gl.linkProgram(this._program.texture);

    this._program.color = gl.createProgram();
    gl.attachShader(this._program.color, vert.color);
    gl.attachShader(this._program.color, frag.color);
    gl.linkProgram(this._program.color);

    if (!gl.getProgramParameter(this._program.texture, gl.LINK_STATUS)) {
      throw new Error("Error in program linking:" + gl.getProgramInfoLog(this._program.texture));
      gl.deleteProgram(this._program.texture);
      return;
    }

    if (!gl.getProgramParameter(this._program.color, gl.LINK_STATUS)) {
      throw new Error("Error in program linking:" + gl.getProgramInfoLog(this._program.color));
      gl.deleteProgram(this._program.color);
      return;
    }

    this._locations = {
      texture: {
        position: gl.getAttribLocation(this._program.texture, "a_position"),
        matrix: gl.getUniformLocation(this._program.texture, "u_matrix"),
        textureMatrix: gl.getUniformLocation(this._program.texture, "u_textureMatrix"),
        texture: gl.getUniformLocation(this._program.texture, "u_texture"),
      },
      color: {
        position: gl.getAttribLocation(this._program.color, "a_position"),
        matrix: gl.getUniformLocation(this._program.color, "u_matrix"),
        color: gl.getUniformLocation(this._program.color, "u_color"),
      },
    };

    this._positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  get width() {
    return (this._gl.drawingBufferWidth);
  }

  get height() {
    return (this._gl.drawingBufferHeight);
  }

  createTextureFromAsset(asset) {
    const gl = this._gl;
    const tex = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 255, 255]));

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.GENERATE_MIPMAP, gl.TRUE);

    const textureInfo = {
      width: asset.width,
      height: asset.height,
      texture: tex,
    };

    gl.bindTexture(gl.TEXTURE_2D, textureInfo.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, asset.width, asset.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, asset);
    gl.generateMipmap(gl.TEXTURE_2D);

    return (textureInfo);
  }

  // ctx.drawImage(tex, texWidth, texHeight, dstX, dstY);
  // ctx.drawImage(tex, texWidth, texHeight, dstX, dstY, dstWidth, dstHeight);
  drawImage(tex, texWidth, texHeight, srcX, srcY, srcWidth, srcHeight, dstX, dstY, dstWidth, dstHeight, srcRotation) {
    const gl = this._gl;

    if (dstX === undefined) {
      dstX = srcX;
      srcX = 0;
    }
    if (dstY === undefined) {
      dstY = srcY;
      srcY = 0;
    }
    if (srcWidth === undefined) {
      srcWidth = texWidth;
    }
    if (srcHeight === undefined) {
      srcHeight = texHeight;
    }
    if (dstWidth === undefined) {
      dstWidth = srcWidth;
      srcWidth = texWidth;
    }
    if (dstHeight === undefined) {
      dstHeight = srcHeight;
      srcHeight = texHeight;
    }
    if (srcRotation === undefined) {
      srcRotation = 0;
    }

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.useProgram(this._program.texture);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
    gl.enableVertexAttribArray(this._locations.texture.position);
    gl.vertexAttribPointer(this._locations.texture.position, 2, gl.FLOAT, false, 0, 0);

    let matrix = m4.orthographic(0, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, -1, 1);
    matrix = m4.translate(matrix, dstX, dstY, 0);
    matrix = m4.scale(matrix, dstWidth, dstHeight, 1);
    gl.uniformMatrix4fv(this._locations.texture.matrix, false, matrix);

    let texMatrix = m4.scaling(1 / texWidth, 1 / texHeight, 1);
    texMatrix = m4.translate(texMatrix, srcX + srcWidth * 0.5, srcY + srcHeight * 0.5, 0);
    texMatrix = m4.zRotate(texMatrix, srcRotation);
    texMatrix = m4.translate(texMatrix, -(srcX + srcWidth * 0.5), -(srcY + srcHeight * 0.5), 0);
    texMatrix = m4.translate(texMatrix, srcX, srcY, 0);
    texMatrix = m4.scale(texMatrix, srcWidth, srcHeight, 1);

    gl.uniformMatrix4fv(this._locations.texture.textureMatrix, false, texMatrix);
    gl.uniform1i(this._locations.texture.texture, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  drawRectangle(x, y, width, height, r = 0, g = 0, b = 0, a = 255, alpha = 0) {
    const gl = this._gl;
    const color = [
      r / 255,
      g / 255,
      b / 255,
      a / 255,
    ];
    gl.useProgram(this._program.color);

    gl.bindBuffer(gl.ARRAY_BUFFER, this._positionBuffer);
    gl.enableVertexAttribArray(this._locations.color.position);
    gl.vertexAttribPointer(this._locations.color.position, 2, gl.FLOAT, false, 0, 0);

    let matrix = m4.orthographic(0, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, -1, 1);
    matrix = m4.translate(matrix, x + width * 0.5, y + height * 0.5, 0);
    matrix = m4.zRotate(matrix, alpha);
    matrix = m4.translate(matrix, -(x + width * 0.5), -(y + height * 0.5), 0);
    matrix = m4.translate(matrix, x, y, 0);
    matrix = m4.scale(matrix, width, height, 1);
    gl.uniformMatrix4fv(this._locations.color.matrix, false, matrix);
    gl.uniform4fv(this._locations.color.color, new Float32Array(color));

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  render() {
    this._gl.flush();
    this._gl.endFrameEXP();
  }

  clear(color) {
    const gl = this._gl;

    if (color) {
      const fmtColor = Color(color).rgb().array().map(clr => clr / 255);
      fmtColor.push(1);
      gl.clearColor.apply(gl, fmtColor);
    } else {
      gl.clearColor(0, 0, 0, 0);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
}

export default GLContext2D;
