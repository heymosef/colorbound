import { useState, useRef, useEffect } from 'react';
import { Eye, Plus, ChevronLeft, ChevronRight, ArrowUp } from 'lucide-react';
import type { Palette } from '../lib/color-utils';
import { rgbToHex, relativeLuminance } from '../lib/color-utils';

import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Textarea } from './ui/textarea';
import { useSupportsP3, getTokenDisplayColor } from '../lib/use-supports-p3';

interface UIPreviewProps {
  palette: Palette;
}

function usePaletteColors(palette: Palette) {
  const supportsP3 = useSupportsP3();
  const hexToRgba = (hex: string, alpha: number) => {
    const [r, g, b] = hex
      .replace('#', '')
      .match(/.{2}/g)!
      .map((value) => parseInt(value, 16));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  const getDisplayCss = (step: number) => {
    const token = palette.tokens.find(t => t.step === step);
    if (!token) return '#888888';
    return getTokenDisplayColor(token, supportsP3);
  };
  /** Get oklch CSS with custom alpha, e.g. `oklch(0.5 0.1 200 / 0.07)` */
  const getDisplayCssAlpha = (step: number, alpha: number) => {
    const token = palette.tokens.find(t => t.step === step);
    if (!token) return `rgba(136,136,136,${alpha})`;
    if (token.targetColorSpace === 'p3' && supportsP3) {
      const { l, c, h } = token.targetOklch;
      return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)} / ${alpha})`;
    }
    return hexToRgba(token.hex, alpha);
  };
  const getLum = (step: number) => {
    const token = palette.tokens.find(t => t.step === step);
    if (!token) return 0.5;
    const [r, g, b] = token.hex
      .replace('#', '')
      .match(/.{2}/g)!
      .map((value) => parseInt(value, 16)) as [number, number, number];
    return relativeLuminance(r, g, b);
  };
  const c = {
    50: getDisplayCss(50), 100: getDisplayCss(100), 200: getDisplayCss(200), 300: getDisplayCss(300),
    400: getDisplayCss(400), 500: getDisplayCss(500), 600: getDisplayCss(600), 700: getDisplayCss(700),
    800: getDisplayCss(800), 900: getDisplayCss(900), 950: getDisplayCss(950),
  };
  const on500 = getLum(500) > 0.18 ? '#000000' : '#ffffff';
  const on600 = getLum(600) > 0.18 ? '#000000' : '#ffffff';
  return { c, on500, on600, getDisplayCssAlpha };
}

function PaletteScope({ palette, children }: { palette: Palette; children: React.ReactNode }) {
  const { c, on600 } = usePaletteColors(palette);
  return (
    <div
      style={{
        '--primary': c[600],
        '--primary-foreground': on600,
        '--ring': c[500],
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

/* ─── 1. SUBSCRIPTIONS ─── */
function SubscriptionsCard({ palette }: UIPreviewProps) {
  const { c } = usePaletteColors(palette);

  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-6 pb-0 px-6 space-y-1.5">
        <div className="flex items-start justify-between">
          <p className="text-sm text-muted-foreground">Subscriptions</p>
          <Button variant="ghost" size="sm">View More</Button>
        </div>
        <p className="text-3xl font-bold tabular-nums tracking-tight">+2,350</p>
        <p className="text-sm text-muted-foreground">+180.1% from last month</p>
        <svg viewBox="0 0 300 150" className="block w-[calc(100%+3rem)] -mx-6 mt-8 -mb-6 h-[150px]" preserveAspectRatio="none">
          <path d="M0,150 C10,148 25,140 40,125 C60,100 80,50 105,30 C125,15 140,35 160,80 C175,110 185,140 200,135 C215,125 225,80 245,65 C260,55 270,75 285,110 C295,135 298,148 300,150 Z" fill={c[600]} opacity={0.1} />
          <path d="M0,150 C10,148 25,140 40,125 C60,100 80,50 105,30 C125,15 140,35 160,80 C175,110 185,140 200,135 C215,125 225,80 245,65 C260,55 270,75 285,110 C295,135 298,148 300,150" fill="none" stroke={c[600]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </CardContent>
    </Card>
  );
}

/* ─── 2. CALENDAR ─── */
function CalendarCard({ palette }: UIPreviewProps) {
  const { c, on600 } = usePaletteColors(palette);
  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const firstDay = 0;
  const daysInMonth = 30;
  const today = 5;
  const selected = 13;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) cells.push(-d);
  }

  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center justify-between mb-3">
          <button className="p-1 rounded hover:bg-muted transition-colors cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]" aria-label="Previous month">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[12px]">June 2025</span>
          <button className="p-1 rounded hover:bg-muted transition-colors cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]" aria-label="Next month">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0 text-center">
          {daysOfWeek.map(d => (
            <div key={d} className="text-[10px] text-muted-foreground py-1">{d}</div>
          ))}
          {cells.map((day, i) => {
            const isToday = day === today;
            const isSelected = day === selected;
            const isOtherMonth = day !== null && day < 0;
            const displayDay = day === null ? '' : Math.abs(day);
            return (
              <div
                key={i}
                className={`text-[11px] py-1.5 rounded-md cursor-pointer transition-colors ${
                  isOtherMonth ? 'text-muted-foreground/50' : ''
                } ${!isToday && !isSelected ? 'hover:bg-muted' : ''}`}
                style={
                  isToday
                    ? { backgroundColor: c[600], color: on600, borderRadius: '6px' }
                    : isSelected
                    ? { border: `1.5px solid ${c[600]}`, borderRadius: '6px' }
                    : {}
                }
              >
                {displayDay}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── 3. UPGRADE SUBSCRIPTION ─── */
function UpgradeSubscriptionCard({ palette }: UIPreviewProps) {
  const { c, on600, getDisplayCssAlpha } = usePaletteColors(palette);
  const [plan, setPlan] = useState('starter');
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-[15px]">Upgrade your Subscription</CardTitle>
        <CardDescription className="text-[13px]">
          You are currently on the free plan. Upgrade to the pro plan to get access to all features.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Name / Email */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Name</Label>
            <Input placeholder="Max Leiter" className="h-9 text-[13px]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Email</Label>
            <Input placeholder="mail@acme.com" className="h-9 text-[13px]" />
          </div>
        </div>

        {/* Card Number / Expiry / CVC */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[120px] space-y-1.5">
            <Label className="text-[12px]">Card Number</Label>
            <Input placeholder="1234 1234 1234 1234" className="h-9 text-[13px]" />
          </div>
          <div className="flex-1 min-w-[80px] space-y-1.5">
            <Label className="text-[12px]">Expiry Date</Label>
            <Input placeholder="MM/YY" className="h-9 text-[13px]" />
          </div>
          <div className="w-[72px] shrink-0 space-y-1.5">
            <Label className="text-[12px]">CVC</Label>
            <Input placeholder="CVC" className="h-9 text-[13px]" />
          </div>
        </div>

        {/* Plan */}
        <div className="space-y-2">
          <div>
            <p className="text-[13px] font-medium">Plan</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Select the plan that best fits your needs.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Starter Plan */}
            <button
              type="button"
              onClick={() => setPlan('starter')}
              className="text-left rounded-lg border p-4 transition-all cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              style={
                plan === 'starter'
                  ? { borderColor: c[500], backgroundColor: getDisplayCssAlpha(600, 0.07), outline: `2px solid ${c[500]}`, outlineOffset: '-1px' }
                  : {}
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">Starter Plan</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">For small businesses.</p>
                </div>
                <div
                  className={`mt-0.5 shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${plan !== 'starter' ? 'border-muted-foreground/40' : ''}`}
                  style={plan === 'starter' ? { borderColor: c[400] } : undefined}
                >
                  {plan === 'starter' && (
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c[400] }} />
                  )}
                </div>
              </div>
            </button>

            {/* Pro Plan */}
            <button
              type="button"
              onClick={() => setPlan('pro')}
              className="text-left rounded-lg border p-4 transition-all cursor-pointer outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              style={
                plan === 'pro'
                  ? { borderColor: c[500], backgroundColor: getDisplayCssAlpha(600, 0.07), outline: `2px solid ${c[500]}`, outlineOffset: '-1px' }
                  : {}
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">Pro Plan</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">More features and storage.</p>
                </div>
                <div
                  className={`mt-0.5 shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${plan !== 'pro' ? 'border-muted-foreground/40' : ''}`}
                  style={plan === 'pro' ? { borderColor: c[400] } : undefined}
                >
                  {plan === 'pro' && (
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c[400] }} />
                  )}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <Label className="text-[13px] font-medium">Notes</Label>
          <Textarea placeholder="Enter notes" className="text-[12px] min-h-[72px] resize-none" />
        </div>

        {/* Checkboxes */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <Checkbox id="terms-upgrade" />
            <label htmlFor="terms-upgrade" className="text-[12px] cursor-pointer">I agree to the terms and conditions</label>
          </div>
          <div className="flex items-center gap-2.5">
            <Checkbox id="emails-upgrade" defaultChecked />
            <label htmlFor="emails-upgrade" className="text-[12px] cursor-pointer">Allow us to send you emails</label>
          </div>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" className="text-[12px] h-9 px-4">Cancel</Button>
        <Button className="text-[12px] h-9 px-4" style={{ backgroundColor: c[600], color: on600 }}>Upgrade Plan</Button>
      </CardFooter>
    </Card>
  );
}

/* ─── 5. CHAT ─── */
function ChatCard({ palette }: UIPreviewProps) {
  const { c, on600 } = usePaletteColors(palette);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9">
            <AvatarFallback className="text-[11px]" style={{ backgroundColor: c[100], color: c[700] }}>SD</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-[15px]">Sofia Davis</CardTitle>
            <CardDescription className="text-[13px]">m@example.com</CardDescription>
          </div>
          <Button variant="outline" size="icon" className="rounded-full h-9 w-9">
            <Plus />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="rounded-lg bg-muted px-3 py-2 max-w-[75%]">
              <p className="text-sm">Hi, how can I help you today?</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <div className="rounded-lg px-3 py-2 max-w-[75%]" style={{ backgroundColor: c[600], color: on600 }}>
              <p className="text-sm">Hey, I'm having trouble with my account.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="rounded-lg bg-muted px-3 py-2 max-w-[75%]">
              <p className="text-sm">What seems to be the problem?</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <div className="rounded-lg px-3 py-2 max-w-[75%]" style={{ backgroundColor: c[600], color: on600 }}>
              <p className="text-sm">I can't log in.</p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex items-center gap-2 w-full">
          <Input placeholder="Type your message..." className="flex-1" />
          <Button size="icon" variant="ghost">
            <ArrowUp />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

/* ─── 10. SLEEP REPORT ─── */
function SleepReportCard({ palette }: UIPreviewProps) {
  const { c } = usePaletteColors(palette);
  const bars = [
    [30, 0, 0], [35, 0, 0], [40, 55, 10], [35, 50, 8],
    [10, 20, 70], [45, 25, 35], [40, 20, 30], [30, 15, 30],
    [55, 15, 25], [50, 10, 20], [15, 40, 15], [35, 25, 30],
  ];
  const maxH = 100;
  const stats = [
    { value: '2h 10m', label: 'Deep' },
    { value: '3h 48m', label: 'Light' },
    { value: '1h 26m', label: 'REM' },
    { value: '84', label: 'Score' },
  ];

  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-[15px]">Sleep Report</CardTitle>
        <CardDescription className="text-[13px]">Last night · 7h 24m</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-[5px] h-[100px]">
          {bars.map((segments, i) => {
            const total = segments[0] + segments[1] + segments[2];
            const scale = total > 0 ? Math.min(total / maxH, 1) : 0;
            const deepPct = total > 0 ? segments[0] / total : 0;
            const lightPct = total > 0 ? segments[1] / total : 0;
            const remPct = total > 0 ? segments[2] / total : 0;
            const barH = scale * 100;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col justify-end rounded-sm overflow-hidden"
                style={{ height: `${barH}%` }}
              >
                {deepPct > 0 && (
                  <div className="w-full" style={{ height: `${deepPct * 100}%`, backgroundColor: c[600] }} />
                )}
                {remPct > 0 && (
                  <div className="w-full" style={{ height: `${remPct * 100}%`, backgroundColor: c[400] }} />
                )}
                {lightPct > 0 && (
                  <div className="w-full" style={{ height: `${lightPct * 100}%`, backgroundColor: c[200] }} />
                )}
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-4 text-center gap-2">
          {stats.map(s => (
            <div key={s.label}>
              <p className="text-[13px] tabular-nums">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <span className="text-[11px] border rounded-full px-2.5 py-0.5 text-muted-foreground">Good</span>
        <Button variant="outline" size="sm" className="text-[12px] h-7 rounded-full">Details</Button>
      </CardFooter>
    </Card>
  );
}

/* ─── 11. TRAFFIC CHANNELS ─── */
function TrafficChannelsCard({ palette }: UIPreviewProps) {
  const { c } = usePaletteColors(palette);
  const [range, setRange] = useState<'6m' | '12m'>('6m');
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(300);

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setChartWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    setChartWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const data = [
    { month: 'Jan', desktop: 186, mobile: 80 },
    { month: 'Feb', desktop: 305, mobile: 200 },
    { month: 'Mar', desktop: 237, mobile: 120 },
    { month: 'Apr', desktop: 73, mobile: 190 },
    { month: 'May', desktop: 209, mobile: 130 },
    { month: 'Jun', desktop: 214, mobile: 140 },
  ];

  const maxValue = Math.max(...data.flatMap(d => [d.desktop, d.mobile]));
  const svgH = 180;
  const padTop = 10;
  const padBottom = 28;
  const plotH = svgH - padTop - padBottom;
  const barGroupCount = data.length;
  const groupGap = chartWidth * 0.08;
  const totalGroupGaps = groupGap * (barGroupCount + 1);
  const groupW = (chartWidth - totalGroupGaps) / barGroupCount;
  const barW = Math.min(groupW * 0.4, 22);
  const barGap = Math.max(barW * 0.15, 2);

  // Grid lines
  const gridLines = 4;
  const gridYs = Array.from({ length: gridLines + 1 }, (_, i) => padTop + (plotH / gridLines) * i);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-[15px]">Traffic Channels</CardTitle>
            <CardDescription className="text-[13px]">
              Desktop vs mobile over the last 6 months
            </CardDescription>
          </div>
          <div className="flex rounded-lg border text-[13px] overflow-hidden">
            <button
              className={`px-3 py-1.5 transition-colors cursor-pointer ${range === '6m' ? 'bg-muted font-medium' : 'hover:bg-muted/50'}`}
              onClick={() => setRange('6m')}
            >
              6M
            </button>
            <button
              className={`px-3 py-1.5 border-l transition-colors cursor-pointer ${range === '12m' ? 'bg-muted font-medium' : 'hover:bg-muted/50'}`}
              onClick={() => setRange('12m')}
            >
              12M
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={chartRef} className="w-full">
          <svg width={chartWidth} height={svgH} className="block">
            {/* Grid lines */}
            {gridYs.map((y, i) => (
              <line key={`grid-${i}`} x1={0} x2={chartWidth} y1={y} y2={y} stroke="var(--color-border)" strokeDasharray="4 4" />
            ))}
            {/* Bar groups */}
            {data.map((d, i) => {
              const groupX = groupGap + i * (groupW + groupGap);
              const centerX = groupX + groupW / 2;
              const desktopH = (d.desktop / maxValue) * plotH;
              const mobileH = (d.mobile / maxValue) * plotH;
              const dX = centerX - barGap / 2 - barW;
              const mX = centerX + barGap / 2;
              const dY = padTop + plotH - desktopH;
              const mY = padTop + plotH - mobileH;
              const r = 4;
              return (
                <g key={d.month}>
                  <rect x={dX} y={dY} width={barW} height={desktopH} rx={r} ry={r} fill={c[300]} />
                  <rect x={mX} y={mY} width={barW} height={mobileH} rx={r} ry={r} fill={c[600]} />
                  <text
                    x={centerX}
                    y={svgH - 6}
                    textAnchor="middle"
                    fontSize={13}
                    fill="var(--color-muted-foreground)"
                  >
                    {d.month}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: c[300] }} />
            <span className="text-[13px] text-muted-foreground">Desktop</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: c[600] }} />
            <span className="text-[13px] text-muted-foreground">Mobile</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <div className="grid grid-cols-3 w-full border-t pt-5">
          <div className="text-center">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Desktop</p>
            <p className="text-2xl font-semibold tabular-nums mt-1">1,224</p>
          </div>
          <div className="text-center border-l">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Mobile</p>
            <p className="text-2xl font-semibold tabular-nums mt-1">860</p>
          </div>
          <div className="text-center border-l">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Mix Delta</p>
            <p className="text-2xl font-semibold tabular-nums mt-1">+42%</p>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN EXPORT  –  bento grid layout
   ═══════════════════════════════════════════════════════════ */
export function UIPreview({ palette }: UIPreviewProps) {
  return (
    <PaletteScope palette={palette}>
      <div className="space-y-4">
        <h3 className="text-[13px] text-muted-foreground flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" />
          UI Component Preview
        </h3>
        <p className="text-[11px] text-muted-foreground -mt-2">
          Composed UI patterns dynamically styled with your palette tokens. Interactive elements reflect the generated color scale.
        </p>

        {/* Container-query masonry grid: responds to panel width, not viewport */}
        <div className="@container">
          <div className="columns-1 @[560px]:columns-2 @[1120px]:columns-3 gap-4">
            <div className="break-inside-avoid mb-4"><SubscriptionsCard palette={palette} /></div>
            <div className="break-inside-avoid mb-4"><CalendarCard palette={palette} /></div>
            <div className="break-inside-avoid mb-4"><SleepReportCard palette={palette} /></div>
            <div className="break-inside-avoid mb-4"><ChatCard palette={palette} /></div>
            <div className="break-inside-avoid mb-4"><UpgradeSubscriptionCard palette={palette} /></div>
            <div className="break-inside-avoid mb-4"><TrafficChannelsCard palette={palette} /></div>
          </div>
        </div>
      </div>
    </PaletteScope>
  );
}
