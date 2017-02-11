var s = c.width = c.height = 400
  , ctx = gl2d.fromElement( c ).getContext( '2d' );

ctx.beginPath();
ctx.lineWidth = 2;
/*for( var i = 0; i < 100; ++i ){
  ctx.data.color = [ i / 100, 0, 1 - i / 100, 1 ];
  ctx.moveTo( i * s / 100 + 2, 10 );
  ctx.lineTo( i * s / 100 + 2, s - 10 );
}*/
ctx.data.color = [ 0, 1, 0, 1 ];
ctx.arc( s / 2, s / 2, 42, 0, Math.PI * 2 );
ctx.stroke();
