import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const encodedId = encodeURIComponent(sessionId);

  const script = `(function(){
  var d=document,s=d.currentScript;
  if(!s)return;
  var iframe=d.createElement('iframe');
  iframe.src='https://shout.run/embed/${encodedId}';
  iframe.style.width='100%';
  iframe.style.height='400px';
  iframe.style.border='none';
  iframe.style.borderRadius='8px';
  iframe.style.overflow='hidden';
  iframe.setAttribute('allowfullscreen','');
  iframe.setAttribute('loading','lazy');
  s.parentNode.insertBefore(iframe,s);
})();`;

  return new NextResponse(script, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
