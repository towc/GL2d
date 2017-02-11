var gl2d = {};

gl2d.fromElement = function( canvasEl ){
  return {
    getContext: function( param, opts ){ return new gl2d.RenderingContext( canvasEl, opts ) },
  }
}
gl2d.defaultOpts = {
  rememberFrame: true,
  arcSteps: false,
  arcStepsParUnitRadius: 1,
};
gl2d.vertexShaderSource = '\
                           \
attribute vec2 a_pos;     \n \
attribute vec4 a_color;   \n \
uniform mat3 u_mat;       \n \
uniform vec2 u_res;       \n \
varying vec4 v_color;     \n \
                          \n \
void main(){              \n \
  gl_Position = vec4(     \n \
    ( vec2( 1, -1 ) *                \n \
      ( vec3(                        \n \
          u_mat * vec3( a_pos, 1 )   \n \
      ).xy / u_res - .5 ) * 2.      \n \
    ),                          \n \
    0, 1 );                     \n \
  v_color = a_color;     \n \
}                         ';
gl2d.fragmentShaderSource = '\
                            \n \
precision mediump float;    \n \
varying vec4 v_color;       \n \
                            \n \
void main(){                \n \
  gl_FragColor = v_color;   \n \
}                           ';

gl2d.createContext = function( canvasEl, opts ){
  return new gl2d.RenderingContext( canvasEl, '2d', opts );
}
gl2d.RenderingContext = function( canvasEl, opts ){

  var webgl = this.webgl = {
    attribLocs: {},
    attribBuffers: {},
    uniformLocs: {}
  };

  this.data = {
    action: {},
    lastAction: {},

    matrix: 
      [ 1, 0, 0,
        0, 1, 0,
        0, 0, 1 ],

    penPos: { x: 0, y: 0 },
    moveToPenPos: { x: 0, y: 0 },
    color: [ 1, 1, 1, 1 ]
  };


  opts = opts || gl2d.defaultOpts;
  for( var key in gl2d.defaultOpts ){
    if( !opts.hasOwnProperty( key ) )
      opts[ key ] = gl2d.defaultOpts[ key ];
  }

  this.opts = opts;
  var gl = webgl.gl = canvasEl.getContext( 'experimental-webgl', { preserveDrawingBuffer: !!opts.rememberFrame } );

  webgl.vertexShader = gl.createShader( gl.VERTEX_SHADER );
  gl.shaderSource( webgl.vertexShader, gl2d.vertexShaderSource );
  gl.compileShader( webgl.vertexShader );

  webgl.fragmentShader = gl.createShader( gl.FRAGMENT_SHADER );
  gl.shaderSource( webgl.fragmentShader, gl2d.fragmentShaderSource );
  gl.compileShader( webgl.fragmentShader );

  webgl.shaderProgram = gl.createProgram();
  gl.attachShader( webgl.shaderProgram, webgl.vertexShader );
  gl.attachShader( webgl.shaderProgram, webgl.fragmentShader );
  gl.linkProgram( webgl.shaderProgram );
  gl.useProgram( webgl.shaderProgram );

  gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
  gl.enable( gl.BLEND );
  
  webgl.attribLocs.pos = gl.getAttribLocation( webgl.shaderProgram, 'a_pos' );
  webgl.attribLocs.color = gl.getAttribLocation( webgl.shaderProgram, 'a_color' );

  webgl.attribBuffers.pos = gl.createBuffer();
  webgl.attribBuffers.color = gl.createBuffer();

  webgl.uniformLocs.res = gl.getUniformLocation( webgl.shaderProgram, 'u_res' );
  webgl.uniformLocs.mat = gl.getUniformLocation( webgl.shaderProgram, 'u_mat' );

  gl.bindBuffer( gl.ARRAY_BUFFER, webgl.attribBuffers.pos );
  gl.enableVertexAttribArray( webgl.attribLocs.pos );
  gl.vertexAttribPointer( webgl.attribLocs.pos, 2, gl.FLOAT, false, 0, 0 );

  gl.bindBuffer( gl.ARRAY_BUFFER, webgl.attribBuffers.color );
  gl.enableVertexAttribArray( webgl.attribLocs.color );
  gl.vertexAttribPointer( webgl.attribLocs.color, 4, gl.FLOAT, false, 0, 0 );

  this.resize( canvasEl.width, canvasEl.height );
  this.lineWidth = 1;
}
gl2d.RenderingContext.prototype.resize = function( w, h ){
  var gl = this.webgl.gl;
  
  gl.viewport( 0, 0, w, h );
  gl.uniform2f( this.webgl.uniformLocs.res, w, h );
}
gl2d.RenderingContext.prototype.beginPath = function(){
  this.data.action = new gl2d.Action( this.data.matrix );
}
gl2d.RenderingContext.prototype.moveTo = function( x, y ){
  if( !this.data.action )
    this.beginPath();

  this.data.penPos.x = this.data.moveToPenPos.x = x;
  this.data.penPos.y = this.data.moveToPenPos.y = y;

}
gl2d.RenderingContext.prototype.lineTo = function( x, y, rest, colors ){
  if( !this.data.action )
    this.moveTo( x, y );
 
  if( !rest )
    rest = [];
  rest.unshift( x, y );

  this.data.action.add( rest, colors || this.data.color, this.data.penPos );
  
  this.data.penPos.x = rest[ rest.length - 2 ];
  this.data.penPos.y = rest[ rest.length - 1 ];
}
gl2d.RenderingContext.prototype.closePath = function(){
  this.lineTo( this.data.moveToPenPos.x, this.data.moveToPenPos.y );
}
gl2d.RenderingContext.prototype.arc = function( x, y, r, start, end, isClockwise, steps ){
  steps = steps || this.opts.arcSteps || Math.ceil( this.opts.arcStepsParUnitRadius * r );

  var stepRadian = ( start - end ) / steps * ( isClockwise ? 1 : -1 )
    , stepSin = Math.sin( stepRadian )
    , stepCos = Math.cos( stepRadian )

    , stepX = r *  Math.cos( start )
    , stepY = r *  Math.sin( start )

    , positions = [];

  if( !this.data.action || ( this.data.action && this.data.action.positions.length === 0 ) ){
    this.moveTo( stepX + x, stepY + y );
  }

  for( var step = 0; step < steps; ++step ){
    
    var X = stepX;
    stepX = stepX * stepCos - stepY * stepSin;
    stepY = stepY * stepCos +     X * stepSin;

    positions.push( stepX + x, stepY + y );
  }

  this.data.action.add( positions, this.data.color, this.data.penPos );

  this.data.penPos.x = stepX + x;
  this.data.penPos.y = stepY + y;
}
gl2d.RenderingContext.prototype.useAction = function( mode ){
  
  var gl = this.webgl.gl
    , action = this.data.action;
  
  
  var positions = []
    , colors = []
    , glType = 0;

  if( mode === 'stroke' ){
    glType = gl.LINES;
    gl.lineWidth( this.lineWidth );

    for( var i = 0; i < action.positions.length; i += 4 ){
      var I = i * 2;
      positions.push( action.positions[ i  ], action.positions[ i + 1 ], action.positions[ i + 2 ], action.positions[ i + 3 ] );
      colors.push(    action.colors[ I     ], action.colors[ I    + 1 ], action.colors[ I    + 2 ], action.colors[ I    + 3 ] );
      colors.push(    action.colors[ I + 4 ], action.colors[ I    + 5 ], action.colors[ I    + 6 ], action.colors[ I    + 7 ] );
    }

  }

  gl.uniformMatrix3fv( this.webgl.uniformLocs.mat, false, action.matrix === 'none' ? this.data.matrix : action.matrix );

  gl.bindBuffer( gl.ARRAY_BUFFER, this.webgl.attribBuffers.pos );
  gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( positions ), gl.STATIC_DRAW );

  gl.bindBuffer( gl.ARRAY_BUFFER, this.webgl.attribBuffers.color );
  gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( colors ), gl.STATIC_DRAW );

  gl.drawArrays( glType, 0, positions.length / 2 );
  
}
gl2d.RenderingContext.prototype.stroke = function(){
  
  this.useAction( 'stroke' );
}

gl2d.Action = function( matrix, positions, colors ){
  
  this.matrix = matrix || 'none';
  
  this.positions = positions || [];
  this.colors = colors || [];
}
gl2d.Action.from = function( action ){
  return new gl2d.Action( action.matrix, action.positions, action.colors );
}
gl2d.Action.prototype.add = function( coordinates, colors, pen ){

  while( colors.length / 4 < coordinates.length / 2 ){
    colors.push( colors[0], colors[1], colors[2], colors[3] );
  }

  var x = pen.x
    , y = pen.y;
  for( var i = 0; i < coordinates.length; i += 2 ){
    this.positions.push( x, y, coordinates[ i ], coordinates[ i + 1 ] );
    x = coordinates[ i ];
    y = coordinates[ i + 1 ];

    this.colors.push( colors[ i ], colors[ i + 1 ], colors[ i + 2 ], colors[ i + 3 ] );
    this.colors.push( colors[ i ], colors[ i + 1 ], colors[ i + 2 ], colors[ i + 3 ] );
  }
}
