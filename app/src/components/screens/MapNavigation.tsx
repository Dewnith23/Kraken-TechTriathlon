// app/src/components/screens/MapNavigation.tsx - Screen 5: Dedicated Full-Screen Map Navigation

import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../state/store';
import { TopBar } from '../shared/TopBar';
import { SignalIndicator } from '../shared/SignalIndicator';
import { SwipeBar } from '../shared/SwipeBar';
import { RoutePill } from '../RoutePill';
import { RecenterButton } from '../RecenterButton';
import { Outlet } from '../../data/mock';

export const MapNavigation: React.FC = () => {
  const {
    selectedRoute,
    activeOutletId,
    setActiveOutletId,
    selectedMapOutletId,
    setSelectedMapOutletId,
    upNextOutlet,
    allOutletsCompleted,
    pushScreen,
    popScreen,
    replaceScreen,
    setReturnTo,
    conditions,
    updateCondition,
    showToast,
    track
  } = useStore();

  const [hasEntered, setHasEntered] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    track('N01');
    const timer = setTimeout(() => setHasEntered(true), 50);
    return () => clearTimeout(timer);
  }, [track]);

  if (!selectedRoute) return null;

  const outlets = selectedRoute.outlets;

  // Selected outlet on map: defaults to selectedMapOutletId or upNextOutlet or outlets[0]
  const currentMapOutlet: Outlet = useMemo(() => {
    if (selectedMapOutletId) {
      const found = outlets.find((o) => o.id === selectedMapOutletId);
      if (found) return found;
    }
    return upNextOutlet || outlets[0];
  }, [selectedMapOutletId, outlets, upNextOutlet]);

  const isCompletedOutlet = currentMapOutlet.status === 'completed';
  const isInProgressOutlet = currentMapOutlet.status === 'in_progress';
  const isArrived = conditions.driverNearNextOutlet && !isCompletedOutlet;

  // Coordinate projections for SVG viewport (390 x 500)
  const svgWidth = 390;
  const svgHeight = 500;
  const padding = 44;

  const points = useMemo(() => {
    if (outlets.length === 0) return [];
    const lats = outlets.map((o) => o.lat);
    const lngs = outlets.map((o) => o.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats) || minLat + 0.1;
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs) || minLng + 0.1;

    return outlets.map((o, idx) => {
      // Scale coordinates to SVG canvas
      const x = padding + ((o.lng - minLng) / (maxLng - minLng)) * (svgWidth - padding * 2);
      const y = padding + (1 - (o.lat - minLat) / (maxLat - minLat)) * (svgHeight - padding * 2);
      return { id: o.id, x, y, outlet: o, index: idx + 1 };
    });
  }, [outlets]);

  // Driver coordinates (near target outlet or point 0)
  const driverPoint = useMemo(() => {
    const target = points.find((p) => p.id === currentMapOutlet.id) || points[0];
    if (isArrived && target) {
      return { x: target.x - 10, y: target.y + 12 };
    }
    return target ? { x: target.x - 26, y: target.y + 32 } : { x: 195, y: 240 };
  }, [points, currentMapOutlet, isArrived]);

  const handlePinTap = (outlet: Outlet, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMapOutletId(outlet.id);
    track('N02');
  };

  const handleRecenter = () => {
    setSelectedMapOutletId(null);
    track('N06');
    showToast('Map centered to route bounds');
  };

  const handleDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    track('N04');
    if (currentMapOutlet.lat != null && currentMapOutlet.lng != null) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${currentMapOutlet.lat},${currentMapOutlet.lng}&travelmode=driving`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenOutlet = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveOutletId(currentMapOutlet.id);
    setReturnTo('map');
    track('N05');
    if (currentMapOutlet.unpackingComplete) {
      pushScreen('pin_confirmation');
    } else {
      pushScreen('market_detail');
    }
  };

  const handleTurnOnGps = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLocating(true);
    track('N07');
    setTimeout(() => {
      setIsLocating(false);
      updateCondition('gpsStatus', 'on');
    }, 600);
  };

  const handleFinishRoute = () => {
    track('N09');
    replaceScreen('shift_summary');
  };

  const isSignalDegraded =
    conditions.networkStatus === 'weak' ||
    conditions.networkStatus === 'offline' ||
    conditions.gpsStatus === 'off' ||
    conditions.gpsQuality === 'weak';

  return (
    <div className="w-full h-full flex flex-col justify-between bg-bg relative overflow-hidden select-none">
      {/* 1. TopBar (44px, "Fleet Logistics" centered, Back chevron on the left, solid page background, no hairline) */}
      <TopBar
        title="Fleet Logistics"
        showBackButton={true}
        onBack={popScreen}
        isScrolled={false}
      />

      {/* 2. Map Area (Full-bleed schematic canvas) */}
      <div
        onClick={() => setSelectedMapOutletId(null)}
        className="flex-1 relative w-full overflow-hidden bg-bg select-none"
      >
        {/* 3a. Route Pill (Top-Left, 12px from edges, 32px tall, surface fill, hairline) */}
        <RoutePill
          routeNumber={selectedRoute.routeNumber}
          distanceKm={selectedRoute.distanceKm}
          className="absolute top-3 left-3 z-20"
        />

        {/* 3b. Recenter Button (Top-Right, 12px from edges, 44px round, surface fill, hairline, fit route glyph) */}
        <RecenterButton
          onRecenter={handleRecenter}
          className="absolute top-3 right-3 z-20"
        />

        {/* SVG Route Map */}
        <svg
          className="w-full h-full absolute inset-0 pointer-events-auto"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Faint road network background lines (8-10 curved lines at 35% opacity) */}
          <g stroke="var(--hairline)" strokeWidth="1.2" strokeOpacity="0.35" fill="none">
            <path d="M -20,80 Q 120,60 220,120 T 410,100" />
            <path d="M -10,180 Q 90,210 200,170 T 400,220" />
            <path d="M 30,-20 Q 80,140 110,260 T 140,520" />
            <path d="M 280,-10 Q 250,150 290,290 T 260,510" />
            <path d="M -10,320 Q 130,290 260,350 T 410,310" />
            <path d="M -20,420 Q 140,450 250,400 T 400,440" />
            <path d="M 180,-10 Q 200,180 180,320 T 210,510" />
            <path d="M 340,30 Q 300,190 350,330 T 320,510" />
          </g>

          {/* 3px Polyline joining outlets in visit order:
              - Segment leading TO a completed outlet is drawn in secondary color at 50% opacity (done)
              - All remaining segments use accent at 90% opacity
          */}
          {points.map((pt, i) => {
            if (i === 0) return null;
            const prev = points[i - 1];
            const isSegmentDone = pt.outlet.status === 'completed';

            return (
              <line
                key={`line-${pt.id}`}
                x1={prev.x}
                y1={prev.y}
                x2={pt.x}
                y2={pt.y}
                stroke={isSegmentDone ? 'var(--text-secondary)' : 'var(--action)'}
                strokeWidth="3.2"
                strokeOpacity={isSegmentDone ? '0.5' : '0.9'}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* Dashed line from driver dot to "Up next" pin (6px dash, 6px gap, accent at 60% opacity) */}
          {conditions.gpsStatus === 'on' && (
            <line
              x1={driverPoint.x}
              y1={driverPoint.y}
              x2={points.find((p) => p.id === currentMapOutlet.id)?.x || driverPoint.x}
              y2={points.find((p) => p.id === currentMapOutlet.id)?.y || driverPoint.y}
              stroke="var(--action)"
              strokeWidth="2"
              strokeDasharray="6,6"
              strokeOpacity="0.6"
            />
          )}

          {/* Driver Location Dot (16px accent dot with 3px surface ring, plus accuracy circle at 12% fill) */}
          {conditions.gpsStatus === 'on' && (
            <g transform={`translate(${driverPoint.x}, ${driverPoint.y})`}>
              {/* Accuracy circle: accent at 12% fill, no stroke, >= 24px across */}
              <circle r="20" fill="var(--action)" fillOpacity="0.12" />
              {/* 3px surface ring + 16px accent dot */}
              <circle r="8" fill="var(--action)" stroke="var(--surface)" strokeWidth="3" />
            </g>
          )}

          {/* Outlet Pins:
              - completed: emerald fill (#00C46A) with white checkmark
              - in progress: accent fill, white number, soft pulsing ring
              - pending: surface fill, 2px ring in secondary text color, number in primary text
              - selected: scale 1.15 plus 3px ring of accent at 30% opacity
          */}
          {points.map((pt) => {
            const isSelected = currentMapOutlet.id === pt.id;
            const isDone = pt.outlet.status === 'completed';
            const isInProgress = pt.outlet.status === 'in_progress';

            return (
              <g
                key={pt.id}
                onClick={(e) => handlePinTap(pt.outlet, e as any)}
                aria-label={`Outlet ${pt.index}, ${pt.outlet.city}, ${pt.outlet.status}`}
                className="cursor-pointer"
                style={{
                  transform: `translate(${pt.x}px, ${pt.y}px) scale(${isSelected ? 1.15 : 1})`,
                  transformOrigin: `${pt.x}px ${pt.y}px`,
                  transition: 'transform 150ms ease-out'
                }}
              >
                {/* 44px transparent hit area */}
                <circle r="22" fill="transparent" />

                {/* 3px accent ring at 30% opacity for selected pin */}
                {isSelected && (
                  <circle
                    r="19"
                    fill="none"
                    stroke="var(--action)"
                    strokeWidth="3"
                    strokeOpacity="0.30"
                  />
                )}

                {/* Pulsing ring on in-progress pin */}
                {isInProgress && !isDone && (
                  <circle
                    r="19"
                    fill="none"
                    stroke="var(--action)"
                    strokeWidth="2"
                    strokeOpacity="0.4"
                    className="animate-ping"
                  />
                )}

                {/* 32px Pin Body */}
                <circle
                  r="16"
                  fill={isDone ? '#00C46A' : isInProgress ? 'var(--action)' : 'var(--surface)'}
                  stroke={isDone ? '#00C46A' : isInProgress ? 'var(--action)' : 'var(--text-secondary)'}
                  strokeWidth="2"
                  filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.12))"
                />

                {/* Pin Glyph: white checkmark for done, white number for in-progress, primary text number for pending */}
                {isDone ? (
                  <path
                    d="M -4 -0.5 L -1 2.5 L 4.5 -3"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <text
                    textAnchor="middle"
                    dy="4.5"
                    fill={isInProgress ? '#ffffff' : 'var(--text-primary)'}
                    fontSize="13"
                    fontWeight="700"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {pt.index}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Attribution: 10px, secondary text, positioned above bottom card */}
        <div className="absolute bottom-48 right-3 z-10 pointer-events-none">
          <span className="text-[10px] text-secondary/80 select-none">
            © OpenStreetMap contributors
          </span>
        </div>

        {/* 3c. Bottom Area (Floating Outlet Card OR Finish Bar) */}
        <div className="absolute bottom-4 left-4 right-4 z-30">
          {allOutletsCompleted ? (
            /* FINISH BAR: only when ALL outlets are completed */
            <div className="w-full bg-surface rounded-[16px] border border-hairline p-2 shadow-xl animate-row-enter">
              <SwipeBar
                selectedRouteNumber={selectedRoute.routeNumber}
                isReadyOverride={true}
                readyText={`Swipe to finish Route ${selectedRoute.routeNumber}`}
                onComplete={handleFinishRoute}
              />
            </div>
          ) : (
            /* OUTLET CARD (Default): 16px from sides, 16px radius, surface fill, hairline */
            <div
              role="status"
              aria-live="polite"
              className="w-full rounded-[16px] bg-surface border border-hairline p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-none select-none transition-opacity duration-150 animate-row-enter"
            >
              {/* Row 1: Label & Distance */}
              <div className="flex items-center justify-between min-h-[18px]">
                <div className="flex items-center gap-1.5">
                  {isArrived && (
                    <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                  )}
                  <span
                    className={`text-[13px] font-medium leading-none ${
                      isArrived ? 'text-success-text' : 'text-secondary'
                    }`}
                  >
                    {isArrived
                      ? "You've arrived"
                      : currentMapOutlet.id === upNextOutlet?.id
                      ? 'Up next'
                      : `Outlet ${currentMapOutlet.visitOrder} of ${outlets.length}`}
                  </span>
                </div>

                {conditions.gpsStatus === 'on' && (
                  <span className="text-[13px] font-mono tabular-nums text-secondary leading-none">
                    {isArrived ? '≈ 80 m away' : '≈ 1.2 km away'}
                  </span>
                )}
              </div>

              {/* Row 2: City */}
              <h2 className="text-[22px] font-semibold text-black dark:text-white tracking-tight leading-snug mt-1 truncate">
                {currentMapOutlet.city}
              </h2>

              {/* Row 3: Status dot plus text */}
              <div className="flex items-center gap-1.5 mt-0.5 min-h-[20px]">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isCompletedOutlet
                      ? 'bg-success'
                      : isInProgressOutlet
                      ? 'bg-action'
                      : 'bg-pending'
                  }`}
                />
                <span className="text-[14px] text-secondary font-normal">
                  {isCompletedOutlet
                    ? `Completed · ${currentMapOutlet.completedAt || '06:52'}`
                    : isInProgressOutlet
                    ? `${currentMapOutlet.itemCount} items · In progress`
                    : `${currentMapOutlet.itemCount} items · Pending`}
                </span>
              </div>

              {/* GPS status helper line if GPS is off */}
              {conditions.gpsStatus === 'off' && !isCompletedOutlet && (
                <div className="mt-2 text-[13px] text-secondary flex items-center gap-1.5">
                  <span>Turn on GPS to see your position.</span>
                  <button
                    type="button"
                    onClick={handleTurnOnGps}
                    className="text-[13px] font-medium text-action hover:underline focus:outline-none cursor-pointer"
                  >
                    {isLocating ? 'Locating…' : 'Turn on'}
                  </button>
                </div>
              )}

              {/* SignalIndicator inside card if weak or offline */}
              {isSignalDegraded && (
                <div className="mt-2 pt-1 border-t border-hairline">
                  <SignalIndicator
                    networkStatus={conditions.networkStatus}
                    gpsStatus={conditions.gpsStatus}
                    gpsQuality={conditions.gpsQuality}
                    showHelperAlways={true}
                  />
                </div>
              )}

              {/* Row 4: Two equal buttons (48px tall, 8px radius, 12px apart) */}
              {!isCompletedOutlet && (
                <div className="grid grid-cols-2 gap-3 mt-3.5 pt-1">
                  {/* Directions Button */}
                  <button
                    type="button"
                    onClick={handleDirections}
                    className={`h-12 rounded-[8px] text-[15px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isArrived
                        ? 'border border-hairline bg-surface text-black dark:text-white hover:bg-hairline/20'
                        : 'bg-action text-white shadow-sm hover:opacity-95'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">navigation</span>
                    <span>Directions</span>
                  </button>

                  {/* Open / Resume Button */}
                  <button
                    type="button"
                    onClick={handleOpenOutlet}
                    className={`h-12 rounded-[8px] text-[15px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      isArrived
                        ? 'bg-action text-white shadow-sm hover:opacity-95'
                        : 'border border-hairline bg-surface text-black dark:text-white hover:bg-hairline/20'
                    }`}
                  >
                    <span>{isInProgressOutlet ? 'Resume' : 'Open'}</span>
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
