# 프로젝트 룸 선택 안했을때 뜨는 화면 모션 참고

You are given a task to integrate an existing React component in the codebase

  

The codebase should support:

- shadcn project structure  

- Tailwind CSS

- Typescript

  

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

  

Determine the default path for components and styles. 

If default path for components is not /components/ui, provide instructions on why it's important to create this folder

Copy-paste this component to /components/ui folder:

```tsx

neural-access-login.tsx

import { cn } from "@/lib/utils";

import { useState } from "react";

  

export const Component = () => {

  const [count, setCount] = useState(0);

  

  return (

    <div className={cn("flex flex-col items-center gap-4 p-4 rounded-lg")}>

      <h1 className="text-2xl font-bold mb-2">Component Example</h1>

      <h2 className="text-xl font-semibold">{count}</h2>

      <div className="flex gap-2">

        <button onClick={() => setCount((prev) => prev - 1)}>-</button>

        <button onClick={() => setCount((prev) => prev + 1)}>+</button>

      </div>

    </div>

  );

};

  

  

demo.tsx

import React, { useEffect, useMemo, useRef } from 'react';

  

const MercuryLogin: React.FC = () => {

    // Generate static random values once per mount to prevent hydration errors

    const blobsData = useMemo(() => {

        return Array.from({ length: 6 }).map(() => ({

            size: Math.random() * 200 + 150,

            left: Math.random() * 80 + 10,

            top: Math.random() * 80 + 10,

            animationDelay: Math.random() * -20,

            animationDuration: Math.random() * 15 + 15,

        }));

    }, []);

  

    // Keep track of the blob DOM elements for high-performance updates

    const blobRefs = useRef<(HTMLDivElement | null)[]>([]);

  

    useEffect(() => {

        const handleMouseMove = (e: MouseEvent) => {

            const x = e.clientX / window.innerWidth;

            const y = e.clientY / window.innerHeight;

  

            // Apply subtle parallax effect to each blob

            blobRefs.current.forEach((blob, index) => {

                if (blob) {

                    const speed = (index + 1) * 20;

                    // Using margins for parallax so we don't overwrite the CSS transform animation

                    blob.style.marginLeft = `${x * speed}px`;

                    blob.style.marginTop = `${y * speed}px`;

                }

            });

        };

  

        document.addEventListener('mousemove', handleMouseMove);

        return () => document.removeEventListener('mousemove', handleMouseMove);

    }, []);

  

    return (

        <div className="mercury-wrapper">

            <style>{`

                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;800&family=Space+Mono&display=swap');

  

                :root {

                    --bg: #050505;

                    --mercury: #e0e0e0;

                    --mercury-dark: #666666;

                    --accent: #ffffff;

                    --text-dim: rgba(255, 255, 255, 0.5);

                    --filter-goo: url('#gooey');

                }

  

                .mercury-wrapper {

                    background-color: var(--bg);

                    color: var(--accent);

                    font-family: 'Inter', sans-serif;

                    height: 100vh;

                    width: 100vw;

                    overflow: hidden;

                    display: flex;

                    align-items: center;

                    justify-content: center;

                    position: relative;

                }

  

                .mercury-wrapper * {

                    box-sizing: border-box;

                    -webkit-font-smoothing: antialiased;

                }

  

                /* Background Liquid Physics Simulation */

                .stage {

                    position: absolute;

                    width: 100%;

                    height: 100%;

                    z-index: 0;

                    filter: var(--filter-goo);

                    opacity: 0.6;

                }

  

                .blob {

                    position: absolute;

                    background: linear-gradient(135deg, var(--mercury), #888);

                    border-radius: 50%;

                    filter: blur(20px);

                    animation: float 20s infinite alternate ease-in-out;

                    box-shadow: inset -10px -10px 20px rgba(0,0,0,0.5), 

                                10px 10px 30px rgba(255,255,255,0.2);

                    transition: margin 0.1s ease-out; /* Smooths the JS mousemove */

                }

  

                @keyframes float {

                    0% { transform: translate(0, 0) scale(1); }

                    33% { transform: translate(10vw, 20vh) scale(1.2); }

                    66% { transform: translate(-5vw, 10vh) scale(0.8); }

                    100% { transform: translate(5vw, -10vh) scale(1.1); }

                }

  

                /* Interface Container */

                .auth-container {

                    position: relative;

                    z-index: 10;

                    width: 100%;

                    max-width: 440px;

                    padding: 40px;

                }

  

                .header {

                    margin-bottom: 60px;

                    text-align: left;

                }

  

                .brand-id {

                    font-family: 'Space Mono', monospace;

                    font-size: 10px;

                    letter-spacing: 4px;

                    text-transform: uppercase;

                    color: var(--text-dim);

                    margin-bottom: 8px;

                    display: block;

                }

  

                .header h1 {

                    font-weight: 800;

                    font-size: 3rem;

                    line-height: 0.9;

                    letter-spacing: -2px;

                    margin-left: -4px;

                    margin-top: 0;

                }

  

                /* Form Elements */

                .form-group {

                    position: relative;

                    margin-bottom: 30px;

                    transition: transform 0.4s cubic-bezier(0.2, 1, 0.3, 1);

                }

  

                .form-group:focus-within {

                    transform: translateX(10px);

                }

  

                .form-group label {

                    display: block;

                    font-family: 'Space Mono', monospace;

                    font-size: 11px;

                    color: var(--text-dim);

                    margin-bottom: 12px;

                    text-transform: uppercase;

                }

  

                .form-group input {

                    width: 100%;

                    background: transparent;

                    border: none;

                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

                    color: var(--accent);

                    padding: 12px 0;

                    font-size: 18px;

                    outline: none;

                    transition: border-color 0.4s;

                }

  

                .input-glow {

                    position: absolute;

                    bottom: 0;

                    left: 0;

                    width: 0%;

                    height: 2px;

                    background: var(--mercury);

                    transition: width 0.6s cubic-bezier(0.2, 1, 0.3, 1);

                    box-shadow: 0 0 15px var(--mercury);

                }

  

                .form-group input:focus + .input-glow {

                    width: 100%;

                }

  

                /* The Mercury Button */

                .submit-wrap {

                    margin-top: 50px;

                    position: relative;

                    filter: var(--filter-goo);

                }

  

                .btn-base {

                    background: var(--accent);

                    color: #000;

                    border: none;

                    padding: 20px 40px;

                    font-size: 14px;

                    font-weight: 800;

                    text-transform: uppercase;

                    letter-spacing: 2px;

                    cursor: pointer;

                    width: 100%;

                    position: relative;

                    z-index: 2;

                    transition: letter-spacing 0.3s;

                }

  

                .btn-base:hover {

                    letter-spacing: 4px;

                }

  

                .mercury-drop {

                    position: absolute;

                    top: 50%;

                    left: 50%;

                    width: 100%;

                    height: 100%;

                    background: var(--mercury);

                    transform: translate(-50%, -50%);

                    z-index: 1;

                    border-radius: 50px;

                    transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);

                }

  

                .submit-wrap:hover .mercury-drop {

                    transform: translate(-50%, -50%) scale(1.05, 1.2);

                    filter: brightness(1.2);

                }

  

                /* Utility */

                .footer-nav {

                    margin-top: 40px;

                    display: flex;

                    justify-content: space-between;

                    font-family: 'Space Mono', monospace;

                    font-size: 10px;

                }

  

                .footer-nav a {

                    color: var(--text-dim);

                    text-decoration: none;

                    transition: color 0.3s;

                }

  

                .footer-nav a:hover {

                    color: var(--accent);

                }

  

                /* SVG Filter Definition Hidden Element */

                .svg-filter-hidden {

                    position: absolute;

                    width: 0;

                    height: 0;

                }

            `}</style>

  

            <svg className="svg-filter-hidden">

                <defs>

                    <filter id="gooey">

                        <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />

                        <feColorMatrix 

                            in="blur" 

                            mode="matrix" 

                            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" 

                            result="goo" 

                        />

                        <feComposite in="SourceGraphic" in2="goo" operator="atop"/>

                    </filter>

                </defs>

            </svg>

  

            <div className="stage" id="stage">

                {blobsData.map((data, index) => (

                    <div

                        key={index}

                        ref={(el) => (blobRefs.current[index] = el)}

                        className="blob"

                        style={{

                            width: `${data.size}px`,

                            height: `${data.size}px`,

                            left: `${data.left}%`,

                            top: `${data.top}%`,

                            animationDelay: `${data.animationDelay}s`,

                            animationDuration: `${data.animationDuration}s`,

                        }}

                    />

                ))}

            </div>

  

            <main className="auth-container">

                <header className="header">

                    <span className="brand-id">System Node: 0x992</span>

                    <h1>NEURAL<br/>ACCESS</h1>

                </header>

  

                <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>

                    <div className="form-group">

                        <label>User Identity</label>

                        <input type="text" placeholder="ID-492-BASE" required />

                        <div className="input-glow"></div>

                    </div>

  

                    <div className="form-group">

                        <label>Sequence Key</label>

                        <input type="password" placeholder="••••••••" required />

                        <div className="input-glow"></div>

                    </div>

  

                    <div className="submit-wrap">

                        <div className="mercury-drop"></div>

                        <button type="submit" className="btn-base">Initialize Stream</button>

                    </div>

                </form>

  

                <footer className="footer-nav">

                    <a href="#encrypted">ENCRYPTED RECOVERY</a>

                    <a href="#archive">NEW ARCHIVE</a>

                </footer>

            </main>

        </div>

    );

};

  

export default MercuryLogin;

```

  

Implementation Guidelines

 1. Analyze the component structure and identify all required dependencies

 2. Review the component's argumens and state

 3. Identify any required context providers or hooks and install them

 4. Questions to Ask

 - What data/props will be passed to this component?

 - Are there any specific state management requirements?

 - Are there any required assets (images, icons, etc.)?

 - What is the expected responsive behavior?

 - What is the best place to use this component in the app?

  

Steps to integrate

 0. Copy paste all the code above in the correct directories

 1. Install external dependencies

 2. Fill image assets with Unsplash stock images you know exist

 3. Use lucide-react icons for svgs or logos if component requires them

# 시계모드일 때 & 타이머로도 적용 가능할 시
You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure  
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
```tsx
flip-clock.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Digit = ({ value }: { value: number }) => {
  return (
    <div className="relative w-10 h-14 overflow-hidden rounded-md bg-zinc-900 text-white font-mono text-3xl font-bold flex items-center justify-center">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

export default function FlipClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");

  return (
    <div className="flex justify-center items-center gap-1 min-h-[100vh]">
      {hours.split("").map((digit, i) => (
        <Digit key={`h-${i}`} value={parseInt(digit)} />
      ))}
      <span className="text-3xl font-bold text-zinc-500">:</span>
      {minutes.split("").map((digit, i) => (
        <Digit key={`m-${i}`} value={parseInt(digit)} />
      ))}
      <span className="text-3xl font-bold text-zinc-500">:</span>
      {seconds.split("").map((digit, i) => (
        <Digit key={`s-${i}`} value={parseInt(digit)} />
      ))}
    </div>
  );
}


demo.tsx
import FlipClock from "@/components/ui/flip-clock";

export default function DemoOne() {
  return <FlipClock />;
}

```

Install NPM dependencies:
```bash
framer-motion
```

Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them

또는
You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure  
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
```tsx
snow-ball-loading-spinner.tsx
export default function LoadingSpinner() {
  return (
    <div className="pl">
      <div className="pl__outer-ring"></div>
      <div className="pl__inner-ring"></div>
      <div className="pl__track-cover"></div>
      <div className="pl__ball">
        <div className="pl__ball-texture"></div>
        <div className="pl__ball-outer-shadow"></div>
        <div className="pl__ball-inner-shadow"></div>
        <div className="pl__ball-side-shadows"></div>
      </div>
    </div>
  );
}

demo.tsx
import LoadingSpinner from '../components/ui/snow-ball-loading-spinner';

export default function Default() {
  return <LoadingSpinner />;
}
```

Extend existing Tailwind 4 index.css with this code (or if project uses Tailwind 3, extend tailwind.config.js or globals.css):
```css
@import "tailwindcss";
@import "tw-animate-css";


@keyframes ball {
  from {
    transform: rotate(0) translateY(-6.5em);
  }
  50% {
    transform: rotate(180deg) translateY(-6em);
  }
  to {
    transform: rotate(360deg) translateY(-6.5em);
  }
}

@keyframes ballInnerShadow {
  from {
    transform: rotate(0);
  }
  to {
    transform: rotate(-360deg);
  }
}

@keyframes ballOuterShadow {
  from {
    transform: rotate(20deg);
  }
  to {
    transform: rotate(-340deg);
  }
}

@keyframes ballTexture {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(50%);
  }
}

@keyframes trackCover {
  from {
    transform: rotate(0);
  }
  to {
    transform: rotate(360deg);
  }
}
```

Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them

# 위젯 인터랙션이나 모션 참고용
You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure  
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
```tsx
glass-calendar.tsx
import * as React from "react";
import { Settings, Plus, Edit2, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, isSameDay, isToday, getDate, getDaysInMonth, startOfMonth } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils"; // Assuming you have a `cn` utility from shadcn

// --- TYPE DEFINITIONS ---
interface Day {
  date: Date;
  isToday: boolean;
  isSelected: boolean;
}

interface GlassCalendarProps extends React.HTMLAttributes<HTMLDivElement> {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  className?: string;
}

// --- HELPER TO HIDE SCROLLBAR ---
const ScrollbarHide = () => (
  <style>{`
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `}</style>
);


// --- MAIN COMPONENT ---
export const GlassCalendar = React.forwardRef<HTMLDivElement, GlassCalendarProps>(
  ({ className, selectedDate: propSelectedDate, onDateSelect, ...props }, ref) => {
    const [currentMonth, setCurrentMonth] = React.useState(propSelectedDate || new Date());
    const [selectedDate, setSelectedDate] = React.useState(propSelectedDate || new Date());

    // Generate all days for the current month
    const monthDays = React.useMemo(() => {
        const start = startOfMonth(currentMonth);
        const totalDays = getDaysInMonth(currentMonth);
        const days: Day[] = [];
        for (let i = 0; i < totalDays; i++) {
            const date = new Date(start.getFullYear(), start.getMonth(), i + 1);
            days.push({
                date,
                isToday: isToday(date),
                isSelected: isSameDay(date, selectedDate),
            });
        }
        return days;
    }, [currentMonth, selectedDate]);

    const handleDateClick = (date: Date) => {
      setSelectedDate(date);
      onDateSelect?.(date);
    };
    
    const handlePrevMonth = () => {
        setCurrentMonth(subMonths(currentMonth, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(addMonths(currentMonth, 1));
    };

    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-w-[360px] rounded-3xl p-5 shadow-2xl overflow-hidden",
          "bg-black/20 backdrop-blur-xl border border-white/10",
          "text-white font-sans",
          className
        )}
        {...props}
      >
        <ScrollbarHide />
        {/* Header: Tabs and Settings */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 rounded-lg bg-black/20 p-1">
            <button className="rounded-md bg-white px-4 py-1 text-xs font-bold text-black shadow-md">
              Weekly
            </button>
            <button className="rounded-md px-4 py-1 text-xs font-semibold text-white/60 transition-colors hover:text-white">
              Monthly
            </button>
          </div>
          <button className="p-2 text-white/70 transition-colors hover:bg-black/20 rounded-full">
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Date Display and Navigation */}
        <div className="my-6 flex items-center justify-between">
            <motion.p 
              key={format(currentMonth, "MMMM")}
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.3 }}
              className="text-4xl font-bold tracking-tight"
            >
                {format(currentMonth, "MMMM")}
            </motion.p>
            <div className="flex items-center space-x-2">
                <button onClick={handlePrevMonth} className="p-1 rounded-full text-white/70 transition-colors hover:bg-black/20">
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={handleNextMonth} className="p-1 rounded-full text-white/70 transition-colors hover:bg-black/20">
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>
        </div>

        {/* Scrollable Monthly Calendar Grid */}
        <div className="overflow-x-auto scrollbar-hide -mx-5 px-5">
            <div className="flex space-x-4">
                {monthDays.map((day) => (
                    <div key={format(day.date, "yyyy-MM-dd")} className="flex flex-col items-center space-y-2 flex-shrink-0">
                        <span className="text-xs font-bold text-white/50">
                            {format(day.date, "E").charAt(0)}
                        </span>
                        <button
                            onClick={() => handleDateClick(day.date)}
                            className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 relative",
                                {
                                    "bg-gradient-to-br from-pink-500 to-orange-400 text-white shadow-lg": day.isSelected,
                                    "hover:bg-white/20": !day.isSelected,
                                    "text-white": !day.isSelected,
                                }
                            )}
                        >
                            {day.isToday && !day.isSelected && (
                                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-pink-400"></span>
                            )}
                            {getDate(day.date)}
                        </button>
                    </div>
                ))}
            </div>
        </div>
        
        {/* Divider */}
        <div className="mt-6 h-px bg-white/20" />

        {/* Footer Actions */}
        <div className="mt-4 flex items-center justify-between space-x-4">
           <button className="flex items-center space-x-2 text-sm font-medium text-white/70 transition-colors hover:text-white">
             <Edit2 className="h-4 w-4" />
             <span>Add a note...</span>
           </button>
           <button className="flex items-center space-x-2 rounded-lg bg-black/20 px-3 py-2 text-xs font-bold text-white shadow-md transition-colors hover:bg-black/30">
             <Plus className="h-4 w-4" />
             <span>New Event</span>
           </button>
        </div>
      </div>
    );
  }
);

GlassCalendar.displayName = "GlassCalendar";


demo.tsx
import * as React from "react";
import { GlassCalendar } from "@/components/ui/glass-calendar"; // Adjust the import path as needed

export default function GlassCalendarDemo() {
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  
  // A high-quality, abstract background image for the glass effect
  const backgroundImageUrl = "https://plus.unsplash.com/premium_photo-1673873438024-81d29f555b95?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NjM2fHxjb2xvcnxlbnwwfHwwfHx8MA%3D%3D";

  return (
    <div 
      className="flex min-h-screen w-full items-center justify-center bg-cover bg-center p-4 bg-slate-900"
      style={{ backgroundImage: `url(${backgroundImageUrl})` }}
    >
      <GlassCalendar 
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        className="transform transition-transform duration-500 hover:scale-105"
      />
    </div>
  );
}

```

Install NPM dependencies:
```bash
date-fns, lucide-react, framer-motion
```

Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them

위에꺼 반투명하고 그런 느낌은 참고할만할듯
You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure  
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
```tsx
apple-emoji-picker.tsx
"use client";
import React, { useState, useEffect, useRef } from 'react';

// --- ICONS (No external packages needed) ---
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const MicIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const SmileIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>;
const CatIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z"/><path d="M8 14v.5"/><path d="M16 14v.5"/><path d="M11.25 16.25h1.5L12 17l-.75-.75Z"/></svg>;
const AppleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/></svg>;
const ActivityIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;
const CarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M9 17h6"/></svg>;
const LightbulbIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>;
const HeartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>;
const FlagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>;

const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>;

// --- STORES ---
class RecentStore {
    static KEY = 'apple_emoji_recent';
    static MAX = 50;
    static get() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch { return []; } }
    static add(emoji: string) {
        try {
            let recent = this.get();
            recent = [emoji, ...recent.filter(e => e !== emoji)].slice(0, this.MAX);
            localStorage.setItem(this.KEY, JSON.stringify(recent));
        } catch (e) {}
    }
}

// --- EMOJIS DATASET ---
const FULL_EMOJI_CATEGORIES = [
    { 
        id: 'smileys', 
        name: 'Smileys & People', 
        emojis: [
            {id:'1', native:'😀', name:'Grinning Face', keywords:['smile', 'happy']},
            {id:'2', native:'😃', name:'Smiling Face with Big Eyes', keywords:['happy', 'smile']},
            {id:'3', native:'😄', name:'Smiling Face with Heart-Eyes', keywords:['love', 'adoring']},
            {id:'4', native:'😁', name:'Beaming Face with Smiling Eyes', keywords:['happy']},
            {id:'5', native:'😆', name:'Grinning Squinting Face', keywords:['laugh']},
            {id:'6', native:'😅', name:'Grinning Face with Sweat', keywords:['nervous']},
            {id:'7', native:'🤣', name:'Rolling on the Floor Laughing', keywords:['funny', 'laugh']},
            {id:'8', native:'😂', name:'Face with Tears of Joy', keywords:['laugh', 'cry']},
            {id:'9', native:'🙂', name:'Slightly Smiling Face', keywords:['smile']},
            {id:'10', native:'🙃', name:'Upside-Down Face', keywords:['silly']},
            {id:'11', native:'😉', name:'Winking Face', keywords:['flirt']},
            {id:'12', native:'😊', name:'Smiling Face with Smiling Eyes', keywords:['blush']},
            {id:'13', native:'😇', name:'Smiling Face with Halo', keywords:['angel']},
            {id:'14', native:'🥰', name:'Smiling Face with Hearts', keywords:['love']},
            {id:'15', native:'😍', name:'Smiling Face with Heart-Eyes', keywords:['love']},
            {id:'16', native:'🤩', name:'Star-Struck', keywords:['excited']},
            {id:'17', native:'😘', name:'Face Blowing a Kiss', keywords:['kiss']},
            {id:'18', native:'😗', name:'Kissing Face', keywords:['kiss']},
            {id:'19', native:'☺️', name:'Smiling Face', keywords:['happy']},
            {id:'20', native:'😚', name:'Kissing Face with Closed Eyes', keywords:['kiss']},
            {id:'21', native:'😙', name:'Kissing Face with Smiling Eyes', keywords:['kiss']},
            {id:'22', native:'😋', name:'Face Savoring Food', keywords:['yum']},
            {id:'23', native:'😛', name:'Face with Tongue', keywords:['tongue']},
            {id:'24', native:'😜', name:'Winking Face with Tongue', keywords:['silly']},
            {id:'25', native:'🤪', name:'Zany Face', keywords:['crazy']},
            {id:'26', native:'😝', name:'Squinting Face with Tongue', keywords:['silly']},
            {id:'27', native:'🤑', name:'Money-Mouth Face', keywords:['rich']},
            {id:'28', native:'🤗', name:'Hugging Face', keywords:['hug']},
            {id:'29', native:'🤭', name:'Face with Hand Over Mouth', keywords:['quiet']},
            {id:'30', native:'🤫', name:'Shushing Face', keywords:['quiet']},
            {id:'31', native:'🤔', name:'Thinking Face', keywords:['think']},
            {id:'32', native:'🤐', name:'Zipper-Mouth Face', keywords:['secret']},
            {id:'33', native:'🤨', name:'Face with Raised Eyebrow', keywords:['query']},
            {id:'34', native:'😐', name:'Neutral Face', keywords:['meh']},
            {id:'35', native:'😑', name:'Expressionless Face', keywords:['meh']},
            {id:'36', native:'😶', name:'Face Without Mouth', keywords:['quiet']},
            {id:'37', native:'😏', name:'Smirking Face', keywords:['sly']},
            {id:'38', native:'😒', name:'Unamused Face', keywords:['meh']},
            {id:'39', native:'🙄', name:'Face with Rolling Eyes', keywords:['annoyed']},
            {id:'40', native:'😬', name:'Grimacing Face', keywords:['awkward']},
            {id:'41', native:'🤥', name:'Lying Face', keywords:['lie']},
            {id:'42', native:'😌', name:'Relieved Face', keywords:['relief']},
            {id:'43', native:'😔', name:'Pensive Face', keywords:['sad']},
            {id:'44', native:'😪', name:'Sleepy Face', keywords:['tired']},
            {id:'45', native:'🤤', name:'Drooling Face', keywords:['sleep']},
            {id:'46', native:'😴', name:'Sleeping Face', keywords:['sleep']},
            {id:'47', native:'😷', name:'Face with Medical Mask', keywords:['sick']},
            {id:'48', native:'🤒', name:'Face with Thermometer', keywords:['sick']},
            {id:'49', native:'👍', name:'Thumbs Up', keywords:['yes']},
            {id:'50', native:'👏', name:'Clapping Hands', keywords:['congrats']}
        ] 
    },
    { 
        id: 'animals', 
        name: 'Animals & Nature', 
        emojis: [
            {id:'a1', native:'🐶', name:'Dog Face', keywords:['pet']},
            {id:'a2', native:'🐱', name:'Cat Face', keywords:['pet']},
            {id:'a3', native:'🐭', name:'Mouse Face', keywords:['animal']},
            {id:'a4', native:'🐹', name:'Hamster Face', keywords:['pet']},
            {id:'a5', native:'🐰', name:'Rabbit Face', keywords:['pet']},
            {id:'a6', native:'🦊', name:'Fox', keywords:['wild']},
            {id:'a7', native:'🐻', name:'Bear', keywords:['wild']},
            {id:'a8', native:'🐼', name:'Panda', keywords:['wild']},
            {id:'a9', native:'🐨', name:'Koala', keywords:['wild']},
            {id:'a10', native:'🐯', name:'Tiger Face', keywords:['wild']},
            {id:'a11', native:'🦁', name:'Lion', keywords:['wild']},
            {id:'a12', native:'🐮', name:'Cow Face', keywords:['farm']},
            {id:'a13', native:'🐷', name:'Pig Face', keywords:['farm']},
            {id:'a14', native:'🐸', name:'Frog', keywords:['wild']},
            {id:'a15', native:'🐵', name:'Monkey Face', keywords:['wild']},
            {id:'a16', native:'🐔', name:'Chicken', keywords:['farm']},
            {id:'a17', native:'🐧', name:'Penguin', keywords:['cold']},
            {id:'a18', native:'🐦', name:'Bird', keywords:['wild']},
            {id:'a19', native:'🐤', name:'Baby Chick', keywords:['farm']},
            {id:'a20', native:'🦆', name:'Duck', keywords:['wild']},
            {id:'a21', native:'🦅', name:'Eagle', keywords:['wild']},
            {id:'a22', native:'🦉', name:'Owl', keywords:['wild']},
            {id:'a23', native:'🦇', name:'Bat', keywords:['wild']},
            {id:'a24', native:'🐺', name:'Wolf', keywords:['wild']},
            {id:'a25', native:'🐗', name:'Boar', keywords:['wild']},
            {id:'a26', native:'🐴', name:'Horse Face', keywords:['farm']},
            {id:'a27', native:'🦄', name:'Unicorn', keywords:['magic']},
            {id:'a28', native:'bee', native:'🐝', name:'Honeybee', keywords:['bug']},
            {id:'a29', native:'bug', native:'🐛', name:'Bug', keywords:['insect']},
            {id:'a30', native:'butterfly', native:'🦋', name:'Butterfly', keywords:['bug']},
            {id:'a31', native:'snail', native:'🐌', name:'Snail', keywords:['slow']},
            {id:'a32', native:'ladybug', native:'🐞', name:'Lady Beetle', keywords:['bug']},
            {id:'a33', native:'ant', native:'🐜', name:'Ant', keywords:['bug']},
            {id:'a34', native:'spider', native:'🕷️', name:'Spider', keywords:['bug']},
            {id:'a35', native:'scorpion', native:'🦂', name:'Scorpion', keywords:['wild']},
            {id:'a36', native:'turtle', native:'🐢', name:'Turtle', keywords:['slow']},
            {id:'a37', native:'snake', native:'🐍', name:'Snake', keywords:['wild']},
            {id:'a38', native:'lizard', native:'🦎', name:'Lizard', keywords:['wild']},
            {id:'a39', native:'octopus', native:'🐙', name:'Octopus', keywords:['sea']},
            {id:'a40', native:'squid', native:'🦑', name:'Squid', keywords:['sea']},
            {id:'a41', native:'fish', native:'🐟', name:'Fish', keywords:['sea']},
            {id:'a42', native:'dolphin', native:'🐬', name:'Dolphin', keywords:['sea']},
            {id:'a43', native:'whale', native:'🐳', name:'Spouting Whale', keywords:['sea']},
            {id:'a44', native:'shark', native:'🦈', name:'Shark', keywords:['sea']},
            {id:'a45', native:'rose', native:'🌹', name:'Rose', keywords:['flower']},
            {id:'a46', native:'sunflower', native:'🌻', name:'Sunflower', keywords:['flower']},
            {id:'a47', native:'tree', native:'🌲', name:'Evergreen Tree', keywords:['nature']},
            {id:'a48', native:'cactus', native:'🌵', name:'Cactus', keywords:['nature']},
            {id:'a49', native:'maple', native:'🍁', name:'Maple Leaf', keywords:['nature']},
            {id:'a50', native:'clover', native:'🍀', name:'Four Leaf Clover', keywords:['lucky']}
        ] 
    },
    { 
        id: 'food', 
        name: 'Food & Drink', 
        emojis: [
            {id:'f1', native:'🍎', name:'Red Apple', keywords:['fruit']},
            {id:'f2', native:'🍏', name:'Green Apple', keywords:['fruit']},
            {id:'f3', native:'pear', native:'🍐', name:'Pear', keywords:['fruit']},
            {id:'f4', native:'orange', native:'🍊', name:'Tangerine', keywords:['fruit']},
            {id:'f5', native:'lemon', native:'🍋', name:'Lemon', keywords:['fruit']},
            {id:'f6', native:'banana', native:'🍌', name:'Banana', keywords:['fruit']},
            {id:'f7', native:'watermelon', native:'🍉', name:'Watermelon', keywords:['fruit']},
            {id:'f8', native:'grapes', native:'🍇', name:'Grapes', keywords:['fruit']},
            {id:'f9', native:'strawberry', native:'🍓', name:'Strawberry', keywords:['fruit']},
            {id:'f10', native:'melon', native:'🍈', name:'Melon', keywords:['fruit']},
            {id:'f11', native:'cherry', native:'🍒', name:'Cherries', keywords:['fruit']},
            {id:'f12', native:'peach', native:'🍑', name:'Peach', keywords:['fruit']},
            {id:'f13', native:'pineapple', native:'🍍', name:'Pineapple', keywords:['fruit']},
            {id:'f14', native:'coconut', native:'🥥', name:'Coconut', keywords:['fruit']},
            {id:'f15', native:'kiwi', native:'🥝', name:'Kiwi Fruit', keywords:['fruit']},
            {id:'f16', native:'tomato', native:'🍅', name:'Tomato', keywords:['veg']},
            {id:'f17', native:'eggplant', native:'🍆', name:'Eggplant', keywords:['veg']},
            {id:'f18', native:'avocado', native:'🥑', name:'Avocado', keywords:['healthy']},
            {id:'f19', native:'broccoli', native:'🥦', name:'Broccoli', keywords:['veg']},
            {id:'f20', native:'cucumber', native:'🥒', name:'Cucumber', keywords:['veg']},
            {id:'f21', native:'corn', native:'🌽', name:'Ear of Corn', keywords:['veg']},
            {id:'f22', native:'carrot', native:'🥕', name:'Carrot', keywords:['veg']},
            {id:'f23', native:'potato', native:'🥔', name:'Potato', keywords:['veg']},
            {id:'f24', native:'croissant', native:'🥐', name:'Croissant', keywords:['bakery']},
            {id:'f25', native:'bread', native:'🍞', name:'Bread', keywords:['bakery']},
            {id:'f26', native:'baguette', native:'🥖', name:'Baguette', keywords:['bakery']},
            {id:'f27', native:'cheese', native:'🧀', name:'Cheese Wedge', keywords:['dairy']},
            {id:'f28', native:'egg', native:'🥚', name:'Egg', keywords:['dairy']},
            {id:'f29', native:'pancake', native:'🥞', name:'Pancakes', keywords:['sweet']},
            {id:'f30', native:'waffle', native:'🧇', name:'Waffle', keywords:['sweet']},
            {id:'f31', native:'bacon', native:'🥓', name:'Bacon', keywords:['meat']},
            {id:'f32', native:'burger', native:'🍔', name:'Hamburger', keywords:['fast food']},
            {id:'f33', native:'fries', native:'🍟', name:'French Fries', keywords:['fast food']},
            {id:'f34', native:'pizza', native:'🍕', name:'Pizza', keywords:['fast food']},
            {id:'f35', native:'hotdog', native:'🌭', name:'Hot Dog', keywords:['fast food']},
            {id:'f36', native:'sandwich', native:'🥪', name:'Sandwich', keywords:['fast food']},
            {id:'f37', native:'taco', native:'🌮', name:'Taco', keywords:['mexican']},
            {id:'f38', native:'sushi', native:'🍣', name:'Sushi', keywords:['japanese']},
            {id:'f39', native:'rice', native:'🍚', name:'Cooked Rice', keywords:['japanese']},
            {id:'f40', native:'icecream', native:'🍦', name:'Soft Ice Cream', keywords:['dessert']},
            {id:'f41', native:'cookie', native:'🍪', name:'Cookie', keywords:['dessert']},
            {id:'f42', native:'cake', native:'🍰', name:'Shortcake', keywords:['dessert']},
            {id:'f43', native:'donut', native:'🍩', name:'Doughnut', keywords:['dessert']},
            {id:'f44', native:'chocolate', native:'🍫', name:'Chocolate Bar', keywords:['dessert']},
            {id:'f45', native:'candy', native:'🍬', name:'Candy', keywords:['sweet']},
            {id:'f46', native:'honey', native:'🍯', name:'Honey Pot', keywords:['sweet']},
            {id:'f47', native:'milk', native:'🥛', name:'Glass of Milk', keywords:['drink']},
            {id:'f48', native:'coffee', native:'☕', name:'Hot Beverage', keywords:['drink']},
            {id:'f49', native:'tea', native:'🍵', name:'Teacup Without Handle', keywords:['drink']},
            {id:'f50', native:'beer', native:'🍺', name:'Beer Mug', keywords:['drink']}
        ] 
    },
    {
        id: 'activities',
        name: 'Activities & Sports',
        emojis: [
            {id:'ac1', native:'⚽', name:'Soccer Ball', keywords:['sports']},
            {id:'ac2', native:'🏀', name:'Basketball', keywords:['sports']},
            {id:'ac3', native:'🏈', name:'American Football', keywords:['sports']},
            {id:'ac4', native:'⚾', name:'Baseball', keywords:['sports']},
            {id:'ac5', native:'🥎', name:'Softball', keywords:['sports']},
            {id:'ac6', native:'🎾', name:'Tennis', keywords:['sports']},
            {id:'ac7', native:'🏐', name:'Volleyball', keywords:['sports']},
            {id:'ac8', native:'🏉', name:'Rugby Football', keywords:['sports']},
            {id:'ac9', native:'🎱', name:'Pool 8 Ball', keywords:['sports']},
            {id:'ac10', native:'🏓', name:'Ping Pong', keywords:['sports']},
            {id:'ac11', native:'🏸', name:'Badminton', keywords:['sports']},
            {id:'ac12', native:'🥊', name:'Boxing Glove', keywords:['sports']},
            {id:'ac13', native:'🥋', name:'Martial Arts Uniform', keywords:['sports']},
            {id:'ac14', native:'🛹', name:'Skateboard', keywords:['sports']},
            {id:'ac15', native:'🛼', name:'Roller Skate', keywords:['sports']},
            {id:'ac16', native:'🥅', name:'Goal Net', keywords:['sports']},
            {id:'ac17', native:'🏹', name:'Bow and Arrow', keywords:['sports']},
            {id:'ac18', native:'🎣', name:'Fishing Pole', keywords:['hobby']},
            {id:'ac19', native:'🎮', name:'Video Game', keywords:['play']},
            {id:'ac20', native:'🏆', name:'Trophy', keywords:['win']},
            {id:'ac21', native:'🥇', name:'1st Place Medal', keywords:['win']},
            {id:'ac22', native:'🥈', name:'2nd Place Medal', keywords:['win']},
            {id:'ac23', native:'🥉', name:'3rd Place Medal', keywords:['win']},
            {id:'ac24', native:'guitar', native:'🎸', name:'Guitar', keywords:['music']},
            {id:'ac25', native:'piano', native:'🎹', name:'Musical Keyboard', keywords:['music']},
            {id:'ac26', native:'violin', native:'🎻', name:'Violin', keywords:['music']},
            {id:'ac27', native:'drum', native:'🥁', name:'Drum', keywords:['music']},
            {id:'ac28', native:'trumpet', native:'🎺', name:'Trumpet', keywords:['music']},
            {id:'ac29', native:'mic', native:'🎤', name:'Microphone', keywords:['sing']},
            {id:'ac30', native:'headphones', native:'🎧', name:'Headphones', keywords:['music']},
            {id:'ac31', native:'paint', native:'🎨', name:'Artist Palette', keywords:['draw']},
            {id:'ac32', native:'clapper', native:'🎬', name:'Clapper Board', keywords:['movie']},
            {id:'ac33', native:'ticket', native:'🎫', name:'Ticket', keywords:['movie']},
            {id:'ac34', native:'chess', native:'♟️', name:'Chess Pawn', keywords:['play']},
            {id:'ac35', native:'darts', native:'🎯', name:'Bullseye', keywords:['play']},
            {id:'ac36', native:'yo-yo', native:'🪀', name:'Yo-Yo', keywords:['play']},
            {id:'ac37', native:'kite', native:'🪁', name:'Kite', keywords:['play']},
            {id:'ac38', native:'puzzle', native:'🧩', name:'Puzzle Piece', keywords:['play']},
            {id:'ac39', native:'running', native:'🏃', name:'Person Running', keywords:['sports']},
            {id:'ac40', native:'cycling', native:'🚴', name:'Person Biking', keywords:['sports']},
            {id:'ac41', native:'weight', native:'🏋️', name:'Person Lifting Weights', keywords:['sports']},
            {id:'ac42', native:'swimming', native:'🏊', name:'Person Swimming', keywords:['sports']},
            {id:'ac43', native:'gymnastics', native:'🤸', name:'Person Cartwheeling', keywords:['sports']},
            {id:'ac44', native:'climbing', native:'🧗', name:'Person Climbing', keywords:['sports']},
            {id:'ac45', native:'dancing', native:'💃', name:'Woman Dancing', keywords:['dance']},
            {id:'ac46', native:'bowling', native:'🎳', name:'Bowling', keywords:['sports']},
            {id:'ac47', native:'golf', native:'⛳', name:'Flag in Hole', keywords:['sports']},
            {id:'ac48', native:'sled', native:'🛷', name:'Sled', keywords:['sports']},
            {id:'ac49', native:'ski', native:'🎿', name:'Skis', keywords:['sports']},
            {id:'ac50', native:'ice_skate', native:'⛸️', name:'Ice Skate', keywords:['sports']}
        ]
    },
    {
        id: 'travel',
        name: 'Travel & Places',
        emojis: [
            {id:'t1', native:'🚗', name:'Automobile', keywords:['car']},
            {id:'t2', native:'🚕', name:'Taxi', keywords:['car']},
            {id:'t3', native:'🚙', name:'Sport Utility Vehicle', keywords:['car']},
            {id:'t4', native:'🚌', name:'Bus', keywords:['vehicle']},
            {id:'t5', native:'🚎', name:'Trolleybus', keywords:['vehicle']},
            {id:'t6', native:'🏎️', name:'Racing Car', keywords:['car']},
            {id:'t7', native:'🚓', name:'Police Car', keywords:['car']},
            {id:'t8', native:'ambulance', native:'🚑', name:'Ambulance', keywords:['vehicle']},
            {id:'t9', native:'fire_engine', native:'🚒', name:'Fire Engine', keywords:['vehicle']},
            {id:'t10', native:'van', native:'🚐', name:'Minibus', keywords:['vehicle']},
            {id:'t11', native:'truck', native:'🚚', name:'Delivery Truck', keywords:['vehicle']},
            {id:'t12', native:'tractor', native:'🚜', name:'Tractor', keywords:['vehicle']},
            {id:'t13', native:'scooter', native:'🛵', name:'Motor Scooter', keywords:['vehicle']},
            {id:'t14', native:'bike', native:'🚲', name:'Bicycle', keywords:['vehicle']},
            {id:'t15', native:'train', native:'🚂', name:'Locomotive', keywords:['vehicle']},
            {id:'t16', native:'airplane', native:'✈️', name:'Airplane', keywords:['flight']},
            {id:'t17', native:'rocket', native:'🚀', name:'Rocket', keywords:['space']},
            {id:'t18', native:'ufo', native:'🛸', name:'Flying Saucer', keywords:['alien']},
            {id:'t19', native:'helicopter', native:'🚁', name:'Helicopter', keywords:['flight']},
            {id:'t20', native:'parachute', native:'🪂', name:'Parachute', keywords:['flight']},
            {id:'t21', native:'boat', native:'⛵', name:'Sailboat', keywords:['sea']},
            {id:'t22', native:'ship', native:'🚢', name:'Ship', keywords:['sea']},
            {id:'t23', native:'anchor', native:'⚓', name:'Anchor', keywords:['sea']},
            {id:'t24', native:'fuel', native:'⛽', name:'Fuel Pump', keywords:['gas']},
            {id:'t25', native:'siren', native:'🚨', name:'Police Car Light', keywords:['alarm']},
            {id:'t26', native:'stop_sign', native:'🛑', name:'Stop Sign', keywords:['warning']},
            {id:'t27', native:'house', native:'🏠', name:'House', keywords:['building']},
            {id:'t28', native:'office', native:'🏢', name:'Office Building', keywords:['building']},
            {id:'t29', native:'post_office', native:'🏣', name:'Japanese Post Office', keywords:['building']},
            {id:'t30', native:'hospital', native:'🏥', name:'Hospital', keywords:['building']},
            {id:'t31', native:'bank', native:'🏦', name:'Bank', keywords:['building']},
            {id:'t32', native:'hotel', native:'🏨', name:'Hotel', keywords:['building']},
            {id:'t33', native:'school', native:'🏫', name:'School', keywords:['building']},
            {id:'t34', native:'stadium', native:'🏟️', name:'Stadium', keywords:['building']},
            {id:'t35', native:'church', native:'⛪', name:'Church', keywords:['building']},
            {id:'t36', native:'mosque', native:'🕌', name:'Mosque', keywords:['building']},
            {id:'t37', native:'synagogue', native:'🕍', name:'Synagogue', keywords:['building']},
            {id:'t38', native:'tent', native:'⛺', name:'Tent', keywords:['camp']},
            {id:'t39', native:'ferris', native:'🎡', name:'Ferris Wheel', keywords:['park']},
            {id:'t40', native:'roller_coaster', native:'🎢', name:'Roller Coaster', keywords:['park']},
            {id:'t41', native:'statue', native:'🗽', name:'Statue of Liberty', keywords:['landmark']},
            {id:'t42', native:'tokyo_tower', native:'🗼', name:'Tokyo Tower', keywords:['landmark']},
            {id:'t43', native:'fuji', native:'🗻', name:'Mount Fuji', keywords:['mountain']},
            {id:'t44', native:'volcano', native:'🌋', name:'Volcano', keywords:['nature']},
            {id:'t45', native:'desert', native:'🏜️', name:'Desert', keywords:['nature']},
            {id:'t46', native:'beach', native:'🏖️', name:'Beach with Umbrella', keywords:['summer']},
            {id:'t47', native:'island', native:'🏝️', name:'Desert Island', keywords:['sea']},
            {id:'t48', native:'rainbow', native:'🌈', name:'Rainbow', keywords:['nature']},
            {id:'t49', native:'sun', native:'☀️', name:'Sun', keywords:['nature']},
            {id:'t50', native:'cloud', native:'☁️', name:'Cloud', keywords:['nature']}
        ]
    },
    {
        id: 'objects',
        name: 'Objects',
        emojis: [
            {id:'o1', native:'⌚', name:'Watch', keywords:['time']},
            {id:'o2', native:'📱', name:'Mobile Phone', keywords:['tech']},
            {id:'o3', native:'💻', name:'Laptop', keywords:['tech']},
            {id:'o4', native:'keyboard', native:'⌨️', name:'Keyboard', keywords:['tech']},
            {id:'o5', native:'desktop', native:'🖥️', name:'Desktop Computer', keywords:['tech']},
            {id:'o6', native:'printer', native:'🖨️', name:'Printer', keywords:['tech']},
            {id:'o7', native:'mouse', native:'🖱️', name:'Computer Mouse', keywords:['tech']},
            {id:'o8', native:'controller', native:'🕹️', name:'Joystick', keywords:['play']},
            {id:'o9', native:'camera', native:'📷', name:'Camera', keywords:['photo']},
            {id:'o10', native:'video', native:'📹', name:'Video Camera', keywords:['photo']},
            {id:'o11', native:'projector', native:'📽️', name:'Movie Projector', keywords:['photo']},
            {id:'o12', native:'telephone', native:'☎️', name:'Telephone', keywords:['tech']},
            {id:'o13', native:'tv', native:'📺', name:'Television', keywords:['tech']},
            {id:'o14', native:'radio', native:'📻', name:'Radio', keywords:['tech']},
            {id:'o15', native:'bulb', native:'💡', name:'Light Bulb', keywords:['idea']},
            {id:'o16', native:'flashlight', native:'🔦', name:'Flashlight', keywords:['tool']},
            {id:'o17', native:'candle', native:'🕯️', name:'Candle', keywords:['light']},
            {id:'o18', native:'book', native:'📖', name:'Open Book', keywords:['study']},
            {id:'o19', native:'red_book', native:'📕', name:'Closed Book', keywords:['study']},
            {id:'o20', native:'letter', native:'✉️', name:'Envelope', keywords:['mail']},
            {id:'o21', native:'box', native:'📦', name:'Package', keywords:['mail']},
            {id:'o22', native:'pencil', native:'✏️', name:'Pencil', keywords:['study']},
            {id:'o23', native:'pen', native:'🖊️', name:'Pen', keywords:['study']},
            {id:'o24', native:'key', native:'🔑', name:'Key', keywords:['lock']},
            {id:'o25', native:'hammer', native:'🔨', name:'Hammer', keywords:['tool']},
            {id:'o26', native:'shield', native:'🛡️', name:'Shield', keywords:['security']},
            {id:'o27', native:'cash', native:'💸', name:'Money with Wings', keywords:['money']},
            {id:'o28', native:'dollar', native:'💵', name:'Dollar Banknote', keywords:['money']},
            {id:'o29', native:'gold', native:'🪙', name:'Coin', keywords:['money']},
            {id:'o30', native:'credit', native:'💳', name:'Credit Card', keywords:['money']},
            {id:'o31', native:'scissors', native:'✂️', name:'Scissors', keywords:['tool']},
            {id:'o32', native:'wrench', native:'🔧', name:'Wrench', keywords:['tool']},
            {id:'o33', native:'screwdriver', native:'🪛', name:'Screwdriver', keywords:['tool']},
            {id:'o34', native:'ladder', native:'🪜', name:'Ladder', keywords:['tool']},
            {id:'o35', native:'toolbox', native:'🧰', name:'Toolbox', keywords:['tool']},
            {id:'o36', native:'magnet', native:'🧲', name:'Magnet', keywords:['tool']},
            {id:'o37', native:'syringe', native:'💉', name:'Syringe', keywords:['medical']},
            {id:'o38', native:'pill', native:'💊', name:'Pill', keywords:['medical']},
            {id:'o39', native:'stethoscope', native:'🩺', name:'Stethoscope', keywords:['medical']},
            {id:'o40', native:'telescope', native:'🔭', name:'Telescope', keywords:['science']},
            {id:'o41', native:'microscope', native:'🔬', name:'Microscope', keywords:['science']},
            {id:'o42', native:'umbrella', native:'🌂', name:'Closed Umbrella', keywords:['weather']},
            {id:'o43', native:'briefcase', native:'💼', name:'Briefcase', keywords:['work']},
            {id:'o44', native:'clipboard', native:'📋', name:'Clipboard', keywords:['work']},
            {id:'o45', native:'glasses', native:'👓', name:'Glasses', keywords:['fashion']},
            {id:'o46', native:'basket', native:'🧺', name:'Basket', keywords:['home']},
            {id:'o47', native:'mirror', native:'🪞', name:'Mirror', keywords:['home']},
            {id:'o48', native:'soap', native:'🧼', name:'Soap', keywords:['home']},
            {id:'o49', native:'sponge', native:'🧽', name:'Sponge', keywords:['home']},
            {id:'o50', native:'broom', native:'🧹', name:'Broom', keywords:['home']}
        ]
    },
    {
        id: 'symbols',
        name: 'Symbols',
        emojis: [
            {id:'s1', native:'❤️', name:'Red Heart', keywords:['love']},
            {id:'s2', native:'🧡', name:'Orange Heart', keywords:['love']},
            {id:'s3', native:'💛', name:'Yellow Heart', keywords:['love']},
            {id:'s4', native:'💚', name:'Green Heart', keywords:['love']},
            {id:'s5', native:'💙', name:'Blue Heart', keywords:['love']},
            {id:'s6', native:'💜', name:'Purple Heart', keywords:['love']},
            {id:'s7', native:'🖤', name:'Black Heart', keywords:['love']},
            {id:'s8', native:'🤍', name:'White Heart', keywords:['love']},
            {id:'s9', native:'🤎', name:'Brown Heart', keywords:['love']},
            {id:'s10', native:'💔', name:'Broken Heart', keywords:['sad']},
            {id:'s11', native:'❣️', name:'Heart Exclamation', keywords:['love']},
            {id:'s12', native:'💕', name:'Two Hearts', keywords:['love']},
            {id:'s13', native:'💞', name:'Revolving Hearts', keywords:['love']},
            {id:'s14', native:'💓', name:'Beating Heart', keywords:['love']},
            {id:'s15', native:'💗', name:'Growing Heart', keywords:['love']},
            {id:'s16', native:'💖', name:'Sparkling Heart', keywords:['love']},
            {id:'s17', native:'💘', name:'Heart with Arrow', keywords:['love']},
            {id:'s18', native:'💝', name:'Heart with Ribbon', keywords:['love']},
            {id:'s20', native:'💟', name:'Heart Decoration', keywords:['love']},
            {id:'s21', native:'💤', name:'Zzz', keywords:['sleep']},
            {id:'s22', native:'💥', name:'Collision', keywords:['warning']},
            {id:'s23', native:'♨️', name:'Hot Springs', keywords:['symbol']},
            {id:'s24', native:'🛑', name:'Stop Sign', keywords:['warning']},
            {id:'s25', native:'⚠️', name:'Warning', keywords:['warning']},
            {id:'s26', native:'☣️', name:'Biohazard', keywords:['warning']},
            {id:'s27', native:'☢️', name:'Radioactive', keywords:['warning']},
            {id:'s28', native:'🔇', name:'Muted Speaker', keywords:['sound']},
            {id:'s29', native:'🔈', name:'Speaker Low Volume', keywords:['sound']},
            {id:'s30', native:'🔊', name:'Speaker High Volume', keywords:['sound']},
            {id:'s31', native:'🎵', name:'Musical Note', keywords:['music']},
            {id:'s32', native:'🎶', name:'Musical Notes', keywords:['music']},
            {id:'s33', native:'➕', name:'Plus Sign', keywords:['math']},
            {id:'s34', native:'➖', name:'Minus Sign', keywords:['math']},
            {id:'s35', native:'✖️', name:'Multiply Sign', keywords:['math']},
            {id:'s36', native:'➗', name:'Divide Sign', keywords:['math']},
            {id:'s37', native:'❓', name:'Question Mark', keywords:['query']},
            {id:'s38', native:'❗', name:'Exclamation Mark', keywords:['warning']},
            {id:'s39', native:'💯', name:'Perfect Score', keywords:['perfect']},
            {id:'s40', native:'♻️', name:'Recycle', keywords:['green']},
            {id:'s41', native:'🔱', name:'Trident', keywords:['symbol']},
            {id:'s42', native:'⭕', name:'Circle', keywords:['symbol']},
            {id:'s43', native:'❌', name:'Cross', keywords:['no']},
            {id:'s44', native:'☑️', name:'Check Box', keywords:['yes']},
            {id:'s45', native:'✔️', name:'Check', keywords:['yes']},
            {id:'s46', native:'↗️', name:'Up-Right', keywords:['arrow']},
            {id:'s47', native:'⬇️', name:'Down', keywords:['arrow']},
            {id:'s48', native:'🔄', name:'Refresh', keywords:['refresh']},
            {id:'s49', native:'🇺🇳', name:'UN Flag', keywords:['flag']},
            {id:'s50', native:'♾️', name:'Infinity', keywords:['math']}
        ]
    },
    {
        id: 'flags',
        name: 'Flags of the World',
        emojis: [
            {id:'fl1', native:'🇺🇸', name:'Flag: United States', keywords:['usa', 'america']},
            {id:'fl2', native:'🇬🇧', name:'Flag: United Kingdom', keywords:['britain', 'uk']},
            {id:'fl3', native:'🇨🇦', name:'Flag: Canada', keywords:['canada']},
            {id:'fl4', native:'🇦🇺', name:'Flag: Australia', keywords:['australia']},
            {id:'fl5', native:'🇯🇵', name:'Flag: Japan', keywords:['japan']},
            {id:'fl6', native:'🇩🇪', name:'Flag: Germany', keywords:['germany']},
            {id:'fl7', native:'🇫🇷', name:'Flag: France', keywords:['france']},
            {id:'fl8', native:'🇮🇹', name:'Flag: Italy', keywords:['italy']},
            {id:'fl9', native:'🇧🇷', name:'Flag: Brazil', keywords:['brazil']},
            {id:'fl10', native:'🇮🇳', name:'Flag: India', keywords:['india']},
            {id:'fl11', native:'🇵🇰', name:'Flag: Pakistan', keywords:['pakistan']},
            {id:'fl12', native:'🇨🇳', name:'Flag: China', keywords:['china']},
            {id:'fl13', native:'🇪🇸', name:'Flag: Spain', keywords:['spain']},
            {id:'fl14', native:'🇲🇽', name:'Flag: Mexico', keywords:['mexico']},
            {id:'fl15', native:'🇷🇺', name:'Flag: Russia', keywords:['russia']},
            {id:'fl16', native:'🇰🇷', name:'Flag: South Korea', keywords:['korea']},
            {id:'fl17', native:'🇿🇦', name:'Flag: South Africa', keywords:['africa']},
            {id:'fl18', native:'🇹🇷', name:'Flag: Turkey', keywords:['turkey']},
            {id:'fl19', native:'🇸🇦', name:'Flag: Saudi Arabia', keywords:['saudi']},
            {id:'fl20', native:'🇪🇬', name:'Flag: Egypt', keywords:['egypt']},
            {id:'fl21', native:'🇮🇩', name:'Flag: Indonesia', keywords:['indonesia']},
            {id:'fl22', native:'🇲🇾', name:'Flag: Malaysia', keywords:['malaysia']},
            {id:'fl23', native:'🇸🇬', name:'Flag: Singapore', keywords:['singapore']},
            {id:'fl24', native:'🇳🇿', name:'Flag: New Zealand', keywords:['nz']},
            {id:'fl25', native:'🇳🇱', name:'Flag: Netherlands', keywords:['dutch']},
            {id:'fl26', native:'🇨🇭', name:'Flag: Switzerland', keywords:['swiss']},
            {id:'fl27', native:'🇸🇪', name:'Flag: Sweden', keywords:['sweden']},
            {id:'fl28', native:'🇳🇴', name:'Flag: Norway', keywords:['norway']},
            {id:'fl29', native:'🇩🇰', name:'Flag: Denmark', keywords:['denmark']},
            {id:'fl30', native:'🇫🇮', name:'Flag: Finland', keywords:['finland']},
            {id:'fl31', native:'🇮🇪', name:'Flag: Ireland', keywords:['irish']},
            {id:'fl32', native:'🇵🇹', name:'Flag: Portugal', keywords:['portugal']},
            {id:'fl33', native:'🇬🇷', name:'Flag: Greece', keywords:['greece']},
            {id:'fl34', native:'🇺🇦', name:'Flag: Ukraine', keywords:['ukraine']},
            {id:'fl35', native:'🇵🇱', name:'Flag: Poland', keywords:['poland']},
            {id:'fl36', native:'🇻🇳', name:'Flag: Vietnam', keywords:['vietnam']},
            {id:'fl37', native:'🇹🇭', name:'Flag: Thailand', keywords:['thailand']},
            {id:'fl38', native:'🇵🇭', name:'Flag: Philippines', keywords:['philippines']},
            {id:'fl39', native:'🇦🇷', name:'Flag: Argentina', keywords:['argentina']},
            {id:'fl40', native:'🇨🇱', name:'Flag: Chile', keywords:['chile']},
            {id:'fl41', native:'🇨🇴', name:'Flag: Colombia', keywords:['colombia']},
            {id:'fl42', native:'🇵🇪', name:'Flag: Peru', keywords:['peru']},
            {id:'fl43', native:'🇳🇬', name:'Flag: Nigeria', keywords:['nigeria']},
            {id:'fl44', native:'🇰🇪', name:'Flag: Kenya', keywords:['kenya']},
            {id:'fl45', native:'🇲🇦', name:'Flag: Morocco', keywords:['morocco']},
            {id:'fl46', native:'🇦🇪', name:'Flag: United Arab Emirates', keywords:['uae']},
            {id:'fl47', native:'🇧🇩', name:'Flag: Bangladesh', keywords:['bangladesh']},
            {id:'fl48', native:'🇦🇫', name:'Flag: Afghanistan', keywords:['afghanistan']},
            {id:'fl49', native:'🇮🇷', name:'Flag: Iran', keywords:['iran']},
            {id:'fl50', native:'🇮🇶', name:'Flag: Iraq', keywords:['iraq']},
            {id:'fl51', native:'🇸🇾', name:'Flag: Syria', keywords:['syria']},
            {id:'fl52', native:'🇵🇸', name:'Flag: Palestine', keywords:['palestine']},
            {id:'fl53', native:'🇯🇴', name:'Flag: Jordan', keywords:['jordan']},
            {id:'fl54', native:'🇱🇧', name:'Flag: Lebanon', keywords:['lebanon']},
            {id:'fl55', native:'🇱🇾', name:'Flag: Libya', keywords:['libya']},
            {id:'fl56', native:'🇸🇩', name:'Flag: Sudan', keywords:['sudan']},
            {id:'fl57', native:'🇩🇿', name:'Flag: Algeria', keywords:['algeria']},
            {id:'fl58', native:'🇹🇳', name:'Flag: Tunisia', keywords:['tunisia']},
            {id:'fl59', native:'🇶🇦', name:'Flag: Qatar', keywords:['qatar']},
            {id:'fl60', native:'🇰🇼', name:'Flag: Kuwait', keywords:['kuwait']}
        ]
    }
];

// --- SUB-COMPONENTS ---
const EmojiSearch = ({ value, onChange, isDark, toggleTheme }: any) => {
    const [isListening, setIsListening] = useState(false);
    
    const handleVoice = () => {
        setIsListening(true);
        if ('webkitSpeechRecognition' in window) {
            const rec = new (window as any).webkitSpeechRecognition();
            rec.onresult = (e: any) => { onChange(e.results[0][0].transcript); setIsListening(false); };
            rec.onerror = () => setIsListening(false);
            rec.start();
        } else {
            alert('Voice search not supported in this browser.');
            setIsListening(false);
        }
    };

    return (
        <div className="sticky top-0 z-20 px-4 py-3 bg-[#F5F5F7]/80 backdrop-blur-xl border-b border-black/5 dark:bg-[#1C1C1E]/80 dark:border-white/10">
            <div className="flex items-center w-full h-10 bg-white rounded-[10px] shadow-sm border border-black/5 dark:bg-[#2C2C2E] dark:border-white/5 overflow-hidden">
                <div className="pl-3 text-gray-400"><SearchIcon /></div>
                <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search Emoji" className="flex-1 w-full h-full px-3 text-[15px] bg-transparent outline-none text-black dark:text-white" />
                {value && <button onClick={() => onChange('')} className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"><XIcon /></button>}
                <button onClick={handleVoice} className={`p-2 transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200'}`}><MicIcon /></button>
                <button onClick={toggleTheme} className="p-2 border-l border-black/5 dark:border-white/10 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none" title="Toggle Theme">
                    {isDark ? <SunIcon /> : <MoonIcon />}
                </button>
            </div>
        </div>
    );
};

const EmojiGrid = ({ categories, searchQuery, onSelect, activeCategory, onScrollCategory }: any) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const categoryRefs = useRef<any>({});

    const filteredCategories = categories.map((cat: any) => ({
        ...cat, emojis: cat.emojis.filter((e: any) => e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.keywords.some((k: string) => k.toLowerCase().includes(searchQuery.toLowerCase())))
    })).filter((cat: any) => cat.emojis.length > 0);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const handleScroll = () => {
            const offsets = Object.entries(categoryRefs.current).map(([id, ref]: any) => ({ id, top: ref ? ref.getBoundingClientRect().top - container.getBoundingClientRect().top : Infinity }));
            const current = offsets.filter(o => o.top <= 40).pop();
            if (current && current.id !== activeCategory) onScrollCategory(current.id);
        };
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [activeCategory, onScrollCategory]);

    return (
        <div ref={containerRef} className="flex-1 overflow-y-auto px-4 pb-16 custom-scrollbar scroll-smooth">
            {filteredCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500"><p className="text-sm font-medium">No emojis found</p></div>
            ) : (
                filteredCategories.map((category: any) => (
                    <div key={category.id} ref={el => categoryRefs.current[category.id] = el} className="mb-6" id={`category-${category.id}`}>
                        <h3 className="sticky top-0 z-10 py-1 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-[#F5F5F7]/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md">{category.name}</h3>
                        <div className="grid grid-cols-7 gap-1.5 mt-2">
                            {category.emojis.map((emoji: any) => (
                                <button key={emoji.id} onClick={() => onSelect(emoji)} title={emoji.name} className="flex items-center justify-center w-10 h-10 text-2xl rounded-lg hover:bg-black/5 dark:hover:bg-white/10 hover:scale-125 active:scale-90 transition-all duration-150 focus:outline-none">
                                    {emoji.native}
                                </button>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

const CategoryTabs = ({ activeCategory, onSelect }: any) => {
    const tabs = [
        { id: 'recent', icon: ClockIcon, label: 'Recent' },
        { id: 'smileys', icon: SmileIcon, label: 'Smileys' },
        { id: 'animals', icon: CatIcon, label: 'Animals' },
        { id: 'food', icon: AppleIcon, label: 'Food' },
        { id: 'activities', icon: ActivityIcon, label: 'Activities' },
        { id: 'travel', icon: CarIcon, label: 'Travel' },
        { id: 'objects', icon: LightbulbIcon, label: 'Objects' },
        { id: 'symbols', icon: HeartIcon, label: 'Symbols' },
        { id: 'flags', icon: FlagIcon, label: 'Flags' }
    ];

    return (
        <div className="absolute bottom-0 left-0 right-0 z-20 px-3 py-2 bg-[#F5F5F7]/90 backdrop-blur-xl border-t border-black/5 dark:bg-[#1C1C1E]/90 dark:border-white/10 flex justify-between items-center">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeCategory === tab.id;
                return (
                    <button key={tab.id} onClick={() => onSelect(tab.id)} className={`relative p-1.5 rounded-full transition-colors focus:outline-none ${isActive ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-200'}`} title={tab.label}>
                        {isActive && <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/20 rounded-full" />}
                        <Icon />
                    </button>
                );
            })}
        </div>
    );
};

// --- MAIN EXPORTED COMPONENT ---
export const Component = ({ isOpen, onClose, onEmojiSelect }: any) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('smileys');
    const [recentEmojis, setRecentEmojis] = useState([]);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const recents = RecentStore.get();
            setRecentEmojis(recents.map(native => ({ id: native, native, name: native, keywords: [] })));
        }
        setIsDark(document.documentElement.classList.contains('dark'));
    }, [isOpen]);

    const handleSelect = (emoji: any) => {
        RecentStore.add(emoji.native);
        onEmojiSelect(emoji);
        onClose();
    };

    const handleTabSelect = (categoryId: string) => {
        setActiveCategory(categoryId);
        const el = document.getElementById(`category-${categoryId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    };

    const toggleTheme = () => {
        const nextDark = !isDark;
        setIsDark(nextDark);
        if (nextDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    if (!isOpen) return null;

    const displayCategories = [...(recentEmojis.length > 0 ? [{ id: 'recent', name: 'Recently Used', emojis: recentEmojis }] : []), ...FULL_EMOJI_CATEGORIES];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 pointer-events-auto" onClick={onClose} />
            <div className="pointer-events-auto relative flex flex-col w-[350px] h-[450px] bg-[#F5F5F7]/95 dark:bg-[#1C1C1E]/95 backdrop-blur-3xl border border-white/20 dark:border-white/10 rounded-[28px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 text-black dark:text-white">
                <style dangerouslySetInnerHTML={{__html: `
                    .custom-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(0,0,0,0.18) transparent; }
                    .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.18); border-radius: 99px; border: 2px solid transparent; background-clip: padding-box; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(0,0,0,0.35); }
                    .dark .custom-scrollbar { scrollbar-color: rgba(255,255,255,0.25) transparent; }
                    .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.25); border: 2px solid transparent; background-clip: padding-box; }
                    .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(255,255,255,0.45); }
                `}} />
                <EmojiSearch value={searchQuery} onChange={setSearchQuery} isDark={isDark} toggleTheme={toggleTheme} />
                <EmojiGrid categories={displayCategories} searchQuery={searchQuery} onSelect={handleSelect} activeCategory={activeCategory} onScrollCategory={setActiveCategory} />
                {!searchQuery && <CategoryTabs activeCategory={activeCategory} onSelect={handleTabSelect} />}
            </div>
        </div>
    );
};


demo.tsx
"use client";
import { Component } from "@/components/ui/apple-emoji-picker"; 
import { useState } from 'react';

export default function DemoOne() {
  const [isOpen, setIsOpen] = useState(true); 
  const [selectedEmoji, setSelectedEmoji] = useState('👋');

  return (
    <div className="flex flex-col items-center justify-center w-full h-screen bg-gray-100 dark:bg-zinc-900 transition-colors">
      
      {/* Display Selected Emoji */}
      <div className="text-8xl mb-8 hover:scale-110 active:scale-90 transition-transform cursor-pointer">
        {selectedEmoji}
      </div>

      <button 
        onClick={() => setIsOpen(true)} 
        className="px-6 py-3 bg-white dark:bg-zinc-800 text-black dark:text-white font-semibold rounded-full shadow-lg border border-black/5 dark:border-white/10 hover:scale-105 active:scale-95 transition-all"
      >
         Open Emoji Picker
      </button>
      
      <Component 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        onEmojiSelect={(emoji: any) => setSelectedEmoji(emoji.native)}
      />

    </div>
  );
}

```

Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them

You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure  
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
```tsx
apple-color-picker.tsx
"use client";
import React, { useState, useEffect, useRef } from 'react';

// --- ICONS (No external packages needed) ---
const PipetteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/></svg>;
const XIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>;

// --- UTILS ---
// REMOVED 'export' keyword from helpers to prevent the docgen sandbox from crashing
function hexToRgb(hex: string) {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) { r = parseInt(hex[1]+hex[1],16); g = parseInt(hex[2]+hex[2],16); b = parseInt(hex[3]+hex[3],16); } 
    else if (hex.length === 7) { r = parseInt(hex.slice(1,3),16); g = parseInt(hex.slice(3,5),16); b = parseInt(hex.slice(5,7),16); }
    return { r, g, b };
}

function rgbToHex({ r, g, b }: {r:number,g:number,b:number}) {
    return "#" + [r, g, b].map(x => { const h = Math.round(x).toString(16); return h.length === 1 ? "0"+h : h; }).join("");
}

function rgbToHsv({ r, g, b }: {r:number,g:number,b:number}) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max !== min) {
        switch (max) { case r: h = (g - b) / d + (g < b ? 6 : 0); break; case g: h = (b - r) / d + 2; break; case b: h = (r - g) / d + 4; break; }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, v: v * 100 };
}

function hsvToRgb({ h, s, v }: {h:number,s:number,v:number}) {
    let r = 0, g = 0, b = 0; h /= 360; s /= 100; v /= 100;
    const i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
    switch (i % 6) { case 0: r=v; g=t; b=p; break; case 1: r=q; g=v; b=p; break; case 2: r=p; g=v; b=t; break; case 3: r=p; g=q; b=v; break; case 4: r=t; g=p; b=v; break; case 5: r=v; g=p; b=q; break; }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

const APPLE_GRID_COLORS = [ '#FFFFFF', '#EBEBEB', '#D6D6D6', '#C2C2C2', '#ADADAD', '#999999', '#858585', '#707070', '#5C5C5C', '#474747', '#333333', '#000000', '#003366', '#336699', '#3366CC', '#003399', '#000099', '#0000CC', '#000066', '#333366', '#663399', '#660099', '#330066', '#330033', '#006699', '#0099CC', '#0066CC', '#0033CC', '#0000FF', '#3333FF', '#333399', '#6633CC', '#9933CC', '#9900CC', '#6600CC', '#660066', '#0099CC', '#00CCFF', '#0099FF', '#0066FF', '#3366FF', '#6666FF', '#6666CC', '#9966CC', '#CC66FF', '#CC33FF', '#9900FF', '#990099', '#33CCCC', '#66FFFF', '#33CCFF', '#3399FF', '#6699FF', '#9999FF', '#9999CC', '#CC99FF', '#FF99FF', '#FF66FF', '#CC00FF', '#CC00CC', '#66CCCC', '#99FFFF', '#66CCFF', '#6699FF', '#99CCFF', '#CCCCFF', '#CC99CC', '#FFCCFF', '#FF99FF', '#FF66FF', '#FF33FF', '#FF00FF', '#99CCCC', '#CCFFFF', '#99CCFF', '#9999FF', '#CCCCFF', '#FFFFFF', '#FFCCFF', '#FF99FF', '#FF66FF', '#FF00FF', '#CC00CC', '#990099', '#CCFFCC', '#FFFFCC', '#FFFF99', '#FFFF66', '#FFFF33', '#FFFF00', '#FFCC00', '#FF9900', '#FF6600', '#FF3300', '#FF0000', '#CC0000', '#99FF99', '#CCFF99', '#CCCC66', '#CCCC33', '#CCCC00', '#CC9900', '#CC6600', '#CC3300', '#CC0000', '#990000', '#660000', '#330000', '#66FF66', '#99FF66', '#99CC66', '#99CC33', '#999900', '#996600', '#993300', '#990000', '#660000', '#330000', '#000000', '#000000', '#33FF33', '#66FF33', '#66CC33', '#669933', '#666600', '#663300', '#660000', '#330000', '#000000', '#000000', '#000000', '#000000', '#00FF00', '#33FF00', '#33CC00', '#339900', '#336600', '#333300', '#330000', '#000000', '#000000', '#000000', '#000000', '#000000' ];

// --- COMPONENTS ---
const SegmentedControl = ({ options, selected, onChange }: any) => (
    <div className="relative flex items-center bg-[#E3E3E8] rounded-[9px] p-[2px] mb-4">
        {options.map((option: string) => {
            const isSelected = selected === option;
            return (
                <button key={option} onClick={() => onChange(option)} className={`relative flex-1 z-10 py-1 text-[13px] font-medium transition-all duration-200 ${isSelected ? 'text-black' : 'text-gray-500 hover:text-gray-700'}`}>
                    {isSelected && <div className="absolute inset-0 bg-white rounded-[7px] shadow-sm" style={{ zIndex: -1 }} />}
                    {option}
                </button>
            );
        })}
    </div>
);

const ColorGrid = ({ selectedHex, onChange }: any) => (
    <div className="grid grid-cols-12 gap-[1px] bg-gray-200 p-[1px] rounded-lg overflow-hidden h-[200px]">
        {APPLE_GRID_COLORS.map((color, idx) => {
            const isSelected = selectedHex.toUpperCase() === color.toUpperCase();
            return (
                <button key={idx} className="relative w-full h-full hover:z-10 focus:outline-none" style={{ backgroundColor: color }} onClick={() => onChange(color)}>
                    {isSelected && <div className="absolute inset-0 border-2 border-white mix-blend-difference z-20 pointer-events-none" />}
                </button>
            );
        })}
    </div>
);

const SpectrumPicker = ({ hsv, onChange }: any) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleMove = (e: any) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        let clientX = e.touches ? e.touches[0].clientX : e.clientX;
        let clientY = e.touches ? e.touches[0].clientY : e.clientY;
        let x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        let y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
        onChange({ h: x * 360, s: 100 - (y * 100), v: 100 });
    };

    useEffect(() => {
        const handleUp = () => setIsDragging(false);
        const handleGlobalMove = (e: any) => { if (isDragging) handleMove(e); };
        if (isDragging) { window.addEventListener('mousemove', handleGlobalMove); window.addEventListener('mouseup', handleUp); }
        return () => { window.removeEventListener('mousemove', handleGlobalMove); window.removeEventListener('mouseup', handleUp); };
    }, [isDragging]);

    return (
        <div ref={containerRef} className="relative w-full h-[200px] rounded-xl overflow-hidden cursor-crosshair shadow-inner" style={{ background: `linear-gradient(to bottom, transparent, #000), linear-gradient(to right, #FFF, transparent), linear-gradient(to right, #FF0000 0%, #FFFF00 17%, #00FF00 33%, #00FFFF 50%, #0000FF 67%, #FF00FF 83%, #FF0000 100%)` }} onMouseDown={(e) => { setIsDragging(true); handleMove(e); }}>
            <div className="absolute w-4 h-4 -ml-2 -mt-2 border-2 border-white rounded-full shadow-md pointer-events-none transition-transform duration-75" style={{ left: `${(hsv.h / 360) * 100}%`, top: `${100 - hsv.s}%`, backgroundColor: rgbToHex(hsvToRgb(hsv)) }} />
        </div>
    );
};

const SliderPicker = ({ rgb, hex, onChangeRGB, onChangeHex }: any) => {
    const handleSliderChange = (color: string, value: number) => onChangeRGB({ ...rgb, [color]: value });
    const SliderRow = ({ label, colorKey, value, bgGradient }: any) => (
        <div className="flex items-center gap-4 mb-4">
            <div className="w-12 text-xs font-semibold text-gray-500 uppercase">{label}</div>
            <div className="flex-1 relative h-6 rounded-full shadow-inner" style={{ background: bgGradient }}>
                <input type="range" min="0" max="255" value={value} onChange={(e) => handleSliderChange(colorKey, parseInt(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <div className="absolute top-1/2 -mt-2.5 w-5 h-5 bg-white rounded-full shadow-md border border-gray-200 pointer-events-none" style={{ left: `calc(${(value / 255) * 100}% - 10px)` }}>
                    <div className="absolute inset-1 rounded-full bg-black/10" />
                </div>
            </div>
            <input type="number" value={value} onChange={(e) => handleSliderChange(colorKey, Math.max(0, Math.min(255, parseInt(e.target.value) || 0)))} className="w-12 h-6 px-1 text-xs text-center border border-gray-200 rounded bg-white focus:outline-none" />
        </div>
    );
    return (
        <div className="py-2 h-[200px] flex flex-col justify-between">
            <SliderRow label="Red" colorKey="r" value={rgb.r} bgGradient={`linear-gradient(to right, #000000, #FF0000)`} />
            <SliderRow label="Green" colorKey="g" value={rgb.g} bgGradient={`linear-gradient(to right, #000000, #00FF00)`} />
            <SliderRow label="Blue" colorKey="b" value={rgb.b} bgGradient={`linear-gradient(to right, #000000, #0000FF)`} />
            <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-blue-500 hover:text-blue-600 cursor-pointer">Hex Color #</span>
                <input type="text" value={hex.replace('#', '')} onChange={(e) => { const val = e.target.value; if (/^[0-9A-Fa-f]{0,6}$/.test(val)) onChangeHex('#' + val); }} className="w-20 px-2 py-1 text-sm font-medium text-right border border-gray-200 rounded uppercase" />
            </div>
        </div>
    );
};

const OpacitySlider = ({ opacity, hex, onChange }: any) => (
    <div className="mt-4 border-t border-gray-200 pt-4">
        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Opacity</div>
        <div className="flex items-center gap-4">
            <div className="flex-1 relative h-6 rounded-full shadow-inner bg-white overflow-hidden" style={{ backgroundImage: `linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(135deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(135deg, transparent 75%, #ccc 75%)`, backgroundSize: '8px 8px', backgroundPosition: '0 0, 4px 0, 4px -4px, 0px 4px' }}>
                <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(to right, transparent, ${hex})` }} />
                <input type="range" min="0" max="100" value={opacity} onChange={(e) => onChange(parseInt(e.target.value))} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                <div className="absolute top-1/2 -mt-2.5 w-5 h-5 bg-white rounded-full shadow-md border border-gray-200 pointer-events-none z-0" style={{ left: `calc(${opacity}% - 10px)` }}>
                    <div className="absolute inset-1 rounded-full" style={{ backgroundColor: hex, opacity: opacity / 100 }} />
                </div>
            </div>
            <input type="text" value={`${opacity}%`} onChange={(e) => { const val = parseInt(e.target.value.replace('%', '')); if (!isNaN(val)) onChange(Math.max(0, Math.min(100, val))); }} className="w-14 px-2 py-1 text-sm font-medium text-center border border-gray-200 rounded" />
        </div>
    </div>
);

const RecentColors = ({ recentColors, currentColor, onSelect, onAdd }: any) => (
    <div className="mt-4 border-t border-gray-200 pt-4 flex gap-4">
        <div className="w-12 h-12 rounded-lg shadow-inner border border-gray-200" style={{ backgroundColor: currentColor }} />
        <div className="flex-1 grid grid-cols-6 gap-2 place-content-start">
            {recentColors.map((color: string, idx: number) => (
                <button key={idx} onClick={() => onSelect(color)} className="w-6 h-6 rounded-full shadow-sm border border-gray-200 hover:scale-110 transition-transform" style={{ backgroundColor: color }} />
            ))}
            {recentColors.length < 12 && (
                <button onClick={onAdd} className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-100 border border-gray-200 hover:bg-gray-200 text-gray-500">
                    <PlusIcon />
                </button>
            )}
        </div>
    </div>
);

// ONLY THIS COMPONENT SHOULD BE EXPORTED
export const Component = ({ isOpen, onClose, initialColor = '#007AFF', onChange }: any) => {
    const [activeTab, setActiveTab] = useState('Grid');
    const [hex, setHex] = useState(initialColor);
    const [rgb, setRgb] = useState(hexToRgb(initialColor));
    const [hsv, setHsv] = useState(rgbToHsv(hexToRgb(initialColor)));
    const [opacity, setOpacity] = useState(100);
    const [recentColors, setRecentColors] = useState(['#000000', '#FFFFFF', '#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55']);

    const handleHexChange = (newHex: string) => { setHex(newHex); setRgb(hexToRgb(newHex)); setHsv(rgbToHsv(hexToRgb(newHex))); if (onChange) onChange(newHex); };
    const handleRgbChange = (newRgb: any) => { setRgb(newRgb); setHex(rgbToHex(newRgb)); setHsv(rgbToHsv(newRgb)); if (onChange) onChange(rgbToHex(newRgb)); };
    const handleHsvChange = (newHsv: any) => { setHsv(newHsv); setRgb(hsvToRgb(newHsv)); setHex(rgbToHex(hsvToRgb(newHsv))); if (onChange) onChange(rgbToHex(hsvToRgb(newHsv))); };
    const handleAddRecent = () => { if (!recentColors.includes(hex)) setRecentColors(prev => [hex, ...prev].slice(0, 12)); };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 pointer-events-auto" onClick={onClose} />
            <div className="pointer-events-auto relative w-[280px] bg-[#F5F5F7]/95 backdrop-blur-xl border border-white/20 rounded-[24px] shadow-2xl overflow-hidden p-4 select-none animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-4">
                    <button className="p-1.5 rounded-full hover:bg-black/5 transition-colors text-blue-500"><PipetteIcon /></button>
                    <h2 className="text-[15px] font-semibold text-black">Colors</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5 transition-colors text-gray-500"><XIcon /></button>
                </div>
                <SegmentedControl options={['Grid', 'Spectrum', 'Slider']} selected={activeTab} onChange={setActiveTab} />
                <div className="h-[200px]">
                    {activeTab === 'Grid' && <ColorGrid selectedHex={hex} onChange={handleHexChange} />}
                    {activeTab === 'Spectrum' && <SpectrumPicker hsv={hsv} onChange={handleHsvChange} />}
                    {activeTab === 'Slider' && <SliderPicker rgb={rgb} hex={hex} onChangeRGB={handleRgbChange} onChangeHex={handleHexChange} />}
                </div>
                <OpacitySlider opacity={opacity} hex={hex} onChange={setOpacity} />
                <RecentColors recentColors={recentColors} currentColor={hex} onSelect={handleHexChange} onAdd={handleAddRecent} />
            </div>
        </div>
    );
};


demo.tsx
"use client";
// Yahan humne file ka sahi naam 'apple-color-picker' likha hai
import { Component } from "@/components/ui/apple-color-picker"; 
import { useState } from 'react';

export default function DemoOne() {
  const [isOpen, setIsOpen] = useState(true); 
  const [color, setColor] = useState('#007AFF');

  return (
    <div className="flex flex-col items-center justify-center w-full h-screen bg-gray-100 transition-colors" style={{ backgroundColor: color }}>
      <button onClick={() => setIsOpen(true)} className="px-4 py-2 bg-white text-black font-semibold rounded-lg shadow-md mb-8">
         Open Color Picker
      </button>
      
      <Component 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        initialColor={color}
        onChange={(newColor: string) => setColor(newColor)}
      />
    </div>
  );
}

```

Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them

You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure  
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
```tsx
apple-calendar-picker.tsx
"use client";
import React, { useState, useEffect } from 'react';

// --- ICONS (Zero external packages needed, pure inline SVGs) ---
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
const DropdownArrowIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
const SunIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/></svg>;
const MoonIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>;

// --- MONTH NAMES ---
const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// --- HELPERS ---
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

// --- MAIN EXPORTED CALENDAR COMPONENT ---
export const Component = ({ isOpen, onClose, onDateTimeSelect, initialDate }: any) => {
    const today = initialDate ? new Date(initialDate) : new Date(2022, 8, 7); // Default September 7, 2022
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [selectedDay, setSelectedDay] = useState(today.getDate());
    
    // Dropdown toggle state
    const [showDropdown, setShowDropdown] = useState(false);

    // Time states
    const [hours, setHours] = useState("09");
    const [minutes, setMinutes] = useState("41");
    const [ampm, setAmpm] = useState("AM");

    // Theme state
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
    }, [isOpen]);

    const toggleTheme = () => {
        const nextDark = !isDark;
        setIsDark(nextDark);
        if (nextDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    if (!isOpen) return null;

    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

    const prevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const handleSelectDay = (day: number) => {
        setSelectedDay(day);
        triggerSelect(day, hours, minutes, ampm);
    };

    const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, "");
        if (val.length > 2) val = val.slice(0, 2);
        const num = parseInt(val);
        if (num > 12) val = "12";
        setHours(val);
        triggerSelect(selectedDay, val, minutes, ampm);
    };

    const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, "");
        if (val.length > 2) val = val.slice(0, 2);
        const num = parseInt(val);
        if (num > 59) val = "59";
        setMinutes(val);
        triggerSelect(selectedDay, hours, val, ampm);
    };

    const handleAmpmChange = (newAmpm: string) => {
        setAmpm(newAmpm);
        triggerSelect(selectedDay, hours, minutes, newAmpm);
    };

    const triggerSelect = (day: number, hh: string, mm: string, ampmVal: string) => {
        if (onDateTimeSelect) {
            const formattedDate = new Date(currentYear, currentMonth, day);
            onDateTimeSelect({
                date: formattedDate,
                time: `${hh.padStart(2, '0')}:${mm.padStart(2, '0')} ${ampmVal}`
            });
        }
    };

    // Render calendar grid days
    const renderDays = () => {
        const days = [];
        // Blank cells for alignment
        for (let i = 0; i < firstDayIndex; i++) {
            days.push(<div key={`empty-${i}`} className="w-9 h-9" />);
        }
        // Month days
        for (let day = 1; day <= daysInMonth; day++) {
            const isSelected = day === selectedDay;
            days.push(
                <button
                    key={`day-${day}`}
                    onClick={() => handleSelectDay(day)}
                    className={`w-9 h-9 text-[15px] font-medium rounded-full flex items-center justify-center transition-all focus:outline-none relative ${
                        isSelected 
                            ? 'bg-[#FF3B30] text-white font-semibold shadow-md scale-105 z-10' 
                            : 'text-[#FF3B30] hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                >
                    {day}
                </button>
            );
        }
        return days;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 pointer-events-auto" onClick={onClose} />
            
            {/* Modal Card wrapper */}
            <div className="pointer-events-auto relative w-[310px] bg-white dark:bg-[#1C1C1E] border border-black/5 dark:border-white/10 rounded-[24px] shadow-2xl overflow-hidden p-[18px] transition-colors duration-300 animate-in fade-in zoom-in duration-200">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    {/* Month/Year selector dropdown button */}
                    <button 
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="flex items-center gap-1 text-[17px] font-semibold text-[#FF3B30] hover:opacity-75 transition-opacity focus:outline-none"
                    >
                        <span>{MONTH_NAMES[currentMonth]} {currentYear}</span>
                        <div className={`transition-transform duration-200 ${showDropdown ? 'rotate-180' : 'rotate-0'}`}>
                            <DropdownArrowIcon />
                        </div>
                    </button>

                    {/* Month Navigations & Theme Toggle */}
                    <div className="flex items-center gap-2">
                        {/* Theme Toggle */}
                        <button onClick={toggleTheme} className="p-1.5 rounded-full text-[#FF3B30] hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:outline-none mr-2">
                            {isDark ? <SunIcon /> : <MoonIcon />}
                        </button>
                        
                        {/* Navigation Chevron buttons */}
                        <button onClick={prevMonth} className="p-1.5 text-[#FF3B30] hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors focus:outline-none">
                            <ChevronLeftIcon />
                        </button>
                        <button onClick={nextMonth} className="p-1.5 text-[#FF3B30] hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors focus:outline-none">
                            <ChevronRightIcon />
                        </button>
                    </div>
                </div>

                {/* Weekdays indicator headers */}
                <div className="grid grid-cols-7 gap-y-1 mb-2 text-center">
                    {WEEKDAYS.map((day) => (
                        <div key={day} className="text-[10px] font-bold text-gray-400 dark:text-gray-500 tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid & Dropdown Container */}
                <div className="relative h-[216px] mb-4">
                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-y-1 justify-items-center absolute w-full z-10">
                        {renderDays()}
                    </div>

                    {/* Month/Year Selection Dropdown Overlay */}
                    {showDropdown && (
                        <div className="absolute inset-0 z-30 flex flex-col p-3 rounded-[18px] bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md transition-all duration-200">
                            {/* Year Selector Header */}
                            <div className="flex items-center justify-between mb-3 border-b pb-2 border-black/5 dark:border-white/5">
                                <button onClick={() => setCurrentYear(y => y - 1)} className="p-1.5 text-[#FF3B30] hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
                                    <ChevronLeftIcon />
                                </button>
                                <span className="font-bold text-[16px] text-black dark:text-white">{currentYear}</span>
                                <button onClick={() => setCurrentYear(y => y + 1)} className="p-1.5 text-[#FF3B30] hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
                                    <ChevronRightIcon />
                                </button>
                            </div>

                            {/* Month Selection Grid */}
                            <div className="grid grid-cols-3 gap-1.5 flex-1 overflow-y-auto">
                                {MONTH_NAMES.map((m, idx) => {
                                    const isSelected = idx === currentMonth;
                                    return (
                                        <button
                                            key={m}
                                            onClick={() => {
                                                setCurrentMonth(idx);
                                                setShowDropdown(false);
                                            }}
                                            className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                isSelected
                                                    ? 'bg-[#FF3B30] text-white shadow-sm'
                                                    : 'text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/10'
                                            }`}
                                        >
                                            {m.slice(0, 3)}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Time Settings Row */}
                <div className="border-t border-gray-100 dark:border-white/5 pt-4 flex items-center justify-between">
                    <span className="text-[17px] font-semibold text-black dark:text-white">Time</span>
                    
                    <div className="flex items-center gap-2">
                        {/* Time Inputs Wrapper */}
                        <div className="flex items-center bg-[#E3E3E8] dark:bg-[#2C2C2E] px-2 py-1 rounded-[8px] text-[17px] font-medium text-black dark:text-white transition-colors duration-300">
                            <input
                                type="text"
                                value={hours}
                                onChange={handleHourChange}
                                placeholder="00"
                                className="w-6 bg-transparent text-center focus:outline-none font-semibold"
                            />
                            <span className="opacity-70">:</span>
                            <input
                                type="text"
                                value={minutes}
                                onChange={handleMinuteChange}
                                placeholder="00"
                                className="w-6 bg-transparent text-center focus:outline-none font-semibold"
                            />
                        </div>

                        {/* AM/PM Segmented Control */}
                        <div className="flex bg-[#E3E3E8] dark:bg-[#2C2C2E] p-[2px] rounded-[8px] text-[13px] font-semibold text-black dark:text-white transition-colors duration-300">
                            <button
                                onClick={() => handleAmpmChange("AM")}
                                className={`px-2.5 py-1 rounded-[6px] transition-all focus:outline-none ${
                                    ampm === "AM" 
                                        ? 'bg-white dark:bg-[#505054] shadow-sm text-black dark:text-white' 
                                        : 'opacity-60 hover:opacity-100'
                                }`}
                            >
                                AM
                            </button>
                            <button
                                onClick={() => handleAmpmChange("PM")}
                                className={`px-2.5 py-1 rounded-[6px] transition-all focus:outline-none ${
                                    ampm === "PM" 
                                        ? 'bg-white dark:bg-[#505054] shadow-sm text-black dark:text-white' 
                                        : 'opacity-60 hover:opacity-100'
                                }`}
                            >
                                PM
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};


demo.tsx
"use client";
import { Component } from "@/components/ui/apple-calendar-picker"; 
import { useState } from 'react';

export default function DemoOne() {
  const [isOpen, setIsOpen] = useState(true); 
  const [selectedDateTime, setSelectedDateTime] = useState<any>({
    date: new Date(2022, 8, 7),
    time: "09:41 AM"
  });

  const handleSelect = (data: any) => {
    setSelectedDateTime(data);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-screen bg-gray-100 dark:bg-zinc-950 transition-colors">
      
      {/* Display Selection Info */}
      <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl p-6 shadow-md text-center max-w-sm mb-8">
        <h2 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Selected Schedule</h2>
        <p className="text-2xl font-bold text-black dark:text-white">
          {selectedDateTime.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <p className="text-lg font-medium text-red-500 mt-1">
          {selectedDateTime.time}
        </p>
      </div>

      <button 
        onClick={() => setIsOpen(true)} 
        className="px-6 py-3 bg-[#FF3B30] text-white font-semibold rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"
      >
         Open Calendar
      </button>
      
      <Component 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        initialDate={selectedDateTime.date}
        onDateTimeSelect={handleSelect}
      />

    </div>
  );
}

```

Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them

# 칸반과 투두
You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure  
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
```tsx
kanban.tsx
"use client";

import React, {
  Dispatch,
  SetStateAction,
  useState,
  DragEvent,
  FormEvent,
} from "react";
import { FiPlus, FiTrash } from "react-icons/fi";
import { motion } from "framer-motion";
import { FaFire } from "react-icons/fa";
import { cn } from "@/lib/utils";

export const Kanban = () => {
  return (
    <div className={cn("h-screen w-full bg-neutral-900 text-neutral-50")}>
      <Board />
    </div>
  );
};

const Board = () => {
  const [cards, setCards] = useState(DEFAULT_CARDS);

  return (
    <div className="flex h-full w-full gap-3 overflow-scroll p-12">
      <Column
        title="Backlog"
        column="backlog"
        headingColor="text-neutral-500"
        cards={cards}
        setCards={setCards}
      />
      <Column
        title="TODO"
        column="todo"
        headingColor="text-yellow-200"
        cards={cards}
        setCards={setCards}
      />
      <Column
        title="In progress"
        column="doing"
        headingColor="text-blue-200"
        cards={cards}
        setCards={setCards}
      />
      <Column
        title="Complete"
        column="done"
        headingColor="text-emerald-200"
        cards={cards}
        setCards={setCards}
      />
      <BurnBarrel setCards={setCards} />
    </div>
  );
};

type ColumnProps = {
  title: string;
  headingColor: string;
  cards: CardType[];
  column: ColumnType;
  setCards: Dispatch<SetStateAction<CardType[]>>;
};

const Column = ({
  title,
  headingColor,
  cards,
  column,
  setCards,
}: ColumnProps) => {
  const [active, setActive] = useState(false);

  const handleDragStart = (e: DragEvent, card: CardType) => {
    e.dataTransfer.setData("cardId", card.id);
  };

  const handleDragEnd = (e: DragEvent) => {
    const cardId = e.dataTransfer.getData("cardId");

    setActive(false);
    clearHighlights();

    const indicators = getIndicators();
    const { element } = getNearestIndicator(e, indicators);

    const before = element.dataset.before || "-1";

    if (before !== cardId) {
      let copy = [...cards];

      let cardToTransfer = copy.find((c) => c.id === cardId);
      if (!cardToTransfer) return;
      cardToTransfer = { ...cardToTransfer, column };

      copy = copy.filter((c) => c.id !== cardId);

      const moveToBack = before === "-1";

      if (moveToBack) {
        copy.push(cardToTransfer);
      } else {
        const insertAtIndex = copy.findIndex((el) => el.id === before);
        if (insertAtIndex === undefined) return;

        copy.splice(insertAtIndex, 0, cardToTransfer);
      }

      setCards(copy);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    highlightIndicator(e);

    setActive(true);
  };

  const clearHighlights = (els?: HTMLElement[]) => {
    const indicators = els || getIndicators();

    indicators.forEach((i) => {
      i.style.opacity = "0";
    });
  };

  const highlightIndicator = (e: DragEvent) => {
    const indicators = getIndicators();

    clearHighlights(indicators);

    const el = getNearestIndicator(e, indicators);

    el.element.style.opacity = "1";
  };

  const getNearestIndicator = (e: DragEvent, indicators: HTMLElement[]) => {
    const DISTANCE_OFFSET = 50;

    const el = indicators.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();

        const offset = e.clientY - (box.top + DISTANCE_OFFSET);

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      {
        offset: Number.NEGATIVE_INFINITY,
        element: indicators[indicators.length - 1],
      }
    );

    return el;
  };

  const getIndicators = () => {
    return Array.from(
      document.querySelectorAll(
        `[data-column="${column}"]`
      ) as unknown as HTMLElement[]
    );
  };

  const handleDragLeave = () => {
    clearHighlights();
    setActive(false);
  };

  const filteredCards = cards.filter((c) => c.column === column);

  return (
    <div className="w-56 shrink-0">
      <div className="mb-3 flex items-center justify-between">
        <h3 className={`font-medium ${headingColor}`}>{title}</h3>
        <span className="rounded text-sm text-neutral-400">
          {filteredCards.length}
        </span>
      </div>
      <div
        onDrop={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`h-full w-full transition-colors ${
          active ? "bg-neutral-800/50" : "bg-neutral-800/0"
        }`}
      >
        {filteredCards.map((c) => {
          return <Card key={c.id} {...c} handleDragStart={handleDragStart} />;
        })}
        <DropIndicator beforeId={null} column={column} />
        <AddCard column={column} setCards={setCards} />
      </div>
    </div>
  );
};

type CardProps = CardType & {
  handleDragStart: Function;
};

const Card = ({ title, id, column, handleDragStart }: CardProps) => {
  return (
    <>
      <DropIndicator beforeId={id} column={column} />
      <motion.div
        layout
        layoutId={id}
        draggable="true"
        onDragStart={(e) => handleDragStart(e, { title, id, column })}
        className="cursor-grab rounded border border-neutral-700 bg-neutral-800 p-3 active:cursor-grabbing"
      >
        <p className="text-sm text-neutral-100">{title}</p>
      </motion.div>
    </>
  );
};

type DropIndicatorProps = {
  beforeId: string | null;
  column: string;
};

const DropIndicator = ({ beforeId, column }: DropIndicatorProps) => {
  return (
    <div
      data-before={beforeId || "-1"}
      data-column={column}
      className="my-0.5 h-0.5 w-full bg-violet-400 opacity-0"
    />
  );
};

const BurnBarrel = ({
  setCards,
}: {
  setCards: Dispatch<SetStateAction<CardType[]>>;
}) => {
  const [active, setActive] = useState(false);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setActive(true);
  };

  const handleDragLeave = () => {
    setActive(false);
  };

  const handleDragEnd = (e: DragEvent) => {
    const cardId = e.dataTransfer.getData("cardId");

    setCards((pv) => pv.filter((c) => c.id !== cardId));

    setActive(false);
  };

  return (
    <div
      onDrop={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`mt-10 grid h-56 w-56 shrink-0 place-content-center rounded border text-3xl ${
        active
          ? "border-red-800 bg-red-800/20 text-red-500"
          : "border-neutral-500 bg-neutral-500/20 text-neutral-500"
      }`}
    >
      {active ? <FaFire className="animate-bounce" /> : <FiTrash />}
    </div>
  );
};

type AddCardProps = {
  column: ColumnType;
  setCards: Dispatch<SetStateAction<CardType[]>>;
};

const AddCard = ({ column, setCards }: AddCardProps) => {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!text.trim().length) return;

    const newCard = {
      column,
      title: text.trim(),
      id: Math.random().toString(),
    };

    setCards((pv) => [...pv, newCard]);

    setAdding(false);
  };

  return (
    <>
      {adding ? (
        <motion.form layout onSubmit={handleSubmit}>
          <textarea
            onChange={(e) => setText(e.target.value)}
            autoFocus
            placeholder="Add new task..."
            className="w-full rounded border border-violet-400 bg-violet-400/20 p-3 text-sm text-neutral-50 placeholder-violet-300 focus:outline-0"
          />
          <div className="mt-1.5 flex items-center justify-end gap-1.5">
            <button
              onClick={() => setAdding(false)}
              className="px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:text-neutral-50"
            >
              Close
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded bg-neutral-50 px-3 py-1.5 text-xs text-neutral-950 transition-colors hover:bg-neutral-300"
            >
              <span>Add</span>
              <FiPlus />
            </button>
          </div>
        </motion.form>
      ) : (
        <motion.button
          layout
          onClick={() => setAdding(true)}
          className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 transition-colors hover:text-neutral-50"
        >
          <span>Add card</span>
          <FiPlus />
        </motion.button>
      )}
    </>
  );
};

type ColumnType = "backlog" | "todo" | "doing" | "done";

type CardType = {
  title: string;
  id: string;
  column: ColumnType;
};

const DEFAULT_CARDS: CardType[] = [
  { title: "Look into render bug in dashboard", id: "1", column: "backlog" },
  { title: "SOX compliance checklist", id: "2", column: "backlog" },
  { title: "[SPIKE] Migrate to Azure", id: "3", column: "backlog" },
  { title: "Document Notifications service", id: "4", column: "backlog" },
  {
    title: "Research DB options for new microservice",
    id: "5",
    column: "todo",
  },
  { title: "Postmortem for outage", id: "6", column: "todo" },
  { title: "Sync with product on Q3 roadmap", id: "7", column: "todo" },

  {
    title: "Refactor context providers to use Zustand",
    id: "8",
    column: "doing",
  },
  { title: "Add logging to daily CRON", id: "9", column: "doing" },
  {
    title: "Set up DD dashboards for Lambda listener",
    id: "10",
    column: "done",
  },
];

demo.tsx
import { Kanban } from "@/components/ui/kanban";

const DemoKanban = () => {
  return (
    <div className="flex h-screen w-full justify-center items-center">
      <Kanban />
    </div>
  );
};

export { DemoKanban };
```

Install NPM dependencies:
```bash
react-icons, framer-motion
```

Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them

You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure  
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
```tsx
gantt.tsx
'use client';

import { Card } from '@/components/ui/card';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import {
  DndContext,
  MouseSensor,
  useDraggable,
  useSensor,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { useMouse, useThrottle, useWindowScroll } from '@uidotdev/usehooks';
import { formatDate, getDate } from 'date-fns';
import { formatDistance, isSameDay } from 'date-fns';
import { format } from 'date-fns';
import {
  addDays,
  addMonths,
  differenceInDays,
  differenceInHours,
  differenceInMonths,
  endOfDay,
  endOfMonth,
  getDaysInMonth,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import { atom, useAtom } from 'jotai';
import throttle from 'lodash.throttle';
import { PlusIcon, TrashIcon } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import type {
  CSSProperties,
  FC,
  KeyboardEventHandler,
  MouseEventHandler,
  ReactNode,
  RefObject,
} from 'react';

const draggingAtom = atom(false);
const scrollXAtom = atom(0);

export const useGanttDragging = () => useAtom(draggingAtom);
export const useGanttScrollX = () => useAtom(scrollXAtom);

export type GanttStatus = {
  id: string;
  name: string;
  color: string;
};

export type GanttFeature = {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date;
  status: GanttStatus;
};

export type GanttMarkerProps = {
  id: string;
  date: Date;
  label: string;
};

export type Range = 'daily' | 'monthly' | 'quarterly';

export type TimelineData = {
  year: number;
  quarters: {
    months: {
      days: number;
    }[];
  }[];
}[];

export type GanttContextProps = {
  zoom: number;
  range: Range;
  columnWidth: number;
  sidebarWidth: number;
  headerHeight: number;
  rowHeight: number;
  onAddItem: ((date: Date) => void) | undefined;
  placeholderLength: number;
  timelineData: TimelineData;
  ref: RefObject<HTMLDivElement | null> | null;
};

const getsDaysIn = (range: Range) => {
  // For when range is daily
  let fn = (_date: Date) => 1;

  if (range === 'monthly' || range === 'quarterly') {
    fn = getDaysInMonth;
  }

  return fn;
};

const getDifferenceIn = (range: Range) => {
  let fn = differenceInDays;

  if (range === 'monthly' || range === 'quarterly') {
    fn = differenceInMonths;
  }

  return fn;
};

const getInnerDifferenceIn = (range: Range) => {
  let fn = differenceInHours;

  if (range === 'monthly' || range === 'quarterly') {
    fn = differenceInDays;
  }

  return fn;
};

const getStartOf = (range: Range) => {
  let fn = startOfDay;

  if (range === 'monthly' || range === 'quarterly') {
    fn = startOfMonth;
  }

  return fn;
};

const getEndOf = (range: Range) => {
  let fn = endOfDay;

  if (range === 'monthly' || range === 'quarterly') {
    fn = endOfMonth;
  }

  return fn;
};

const getAddRange = (range: Range) => {
  let fn = addDays;

  if (range === 'monthly' || range === 'quarterly') {
    fn = addMonths;
  }

  return fn;
};

const getDateByMousePosition = (context: GanttContextProps, mouseX: number) => {
  const timelineStartDate = new Date(context.timelineData[0].year, 0, 1);
  const columnWidth = (context.columnWidth * context.zoom) / 100;
  const offset = Math.floor(mouseX / columnWidth);
  const daysIn = getsDaysIn(context.range);
  const addRange = getAddRange(context.range);
  const month = addRange(timelineStartDate, offset);
  const daysInMonth = daysIn(month);
  const pixelsPerDay = Math.round(columnWidth / daysInMonth);
  const dayOffset = Math.floor((mouseX % columnWidth) / pixelsPerDay);
  const actualDate = addDays(month, dayOffset);

  return actualDate;
};

const createInitialTimelineData = (today: Date) => {
  const data: TimelineData = [];

  data.push(
    { year: today.getFullYear() - 1, quarters: new Array(4).fill(null) },
    { year: today.getFullYear(), quarters: new Array(4).fill(null) },
    { year: today.getFullYear() + 1, quarters: new Array(4).fill(null) }
  );

  for (const yearObj of data) {
    yearObj.quarters = new Array(4).fill(null).map((_, quarterIndex) => ({
      months: new Array(3).fill(null).map((_, monthIndex) => {
        const month = quarterIndex * 3 + monthIndex;
        return {
          days: getDaysInMonth(new Date(yearObj.year, month, 1)),
        };
      }),
    }));
  }

  return data;
};

const getOffset = (
  date: Date,
  timelineStartDate: Date,
  context: GanttContextProps
) => {
  const parsedColumnWidth = (context.columnWidth * context.zoom) / 100;
  const differenceIn = getDifferenceIn(context.range);
  const startOf = getStartOf(context.range);
  const fullColumns = differenceIn(startOf(date), timelineStartDate);

  if (context.range === 'daily') {
    return parsedColumnWidth * fullColumns;
  }

  const partialColumns = date.getDate();
  const daysInMonth = getDaysInMonth(date);
  const pixelsPerDay = parsedColumnWidth / daysInMonth;

  return fullColumns * parsedColumnWidth + partialColumns * pixelsPerDay;
};

const getWidth = (
  startAt: Date,
  endAt: Date | null,
  context: GanttContextProps
) => {
  const parsedColumnWidth = (context.columnWidth * context.zoom) / 100;

  if (!endAt) {
    return parsedColumnWidth * 2;
  }

  const differenceIn = getDifferenceIn(context.range);

  if (context.range === 'daily') {
    const delta = differenceIn(endAt, startAt);

    return parsedColumnWidth * (delta ? delta : 1);
  }

  const daysInStartMonth = getDaysInMonth(startAt);
  const pixelsPerDayInStartMonth = parsedColumnWidth / daysInStartMonth;

  if (isSameDay(startAt, endAt)) {
    return pixelsPerDayInStartMonth;
  }

  const innerDifferenceIn = getInnerDifferenceIn(context.range);
  const startOf = getStartOf(context.range);

  if (isSameDay(startOf(startAt), startOf(endAt))) {
    return innerDifferenceIn(endAt, startAt) * pixelsPerDayInStartMonth;
  }

  const startRangeOffset = daysInStartMonth - getDate(startAt);
  const endRangeOffset = getDate(endAt);
  const fullRangeOffset = differenceIn(startOf(endAt), startOf(startAt));
  const daysInEndMonth = getDaysInMonth(endAt);
  const pixelsPerDayInEndMonth = parsedColumnWidth / daysInEndMonth;

  return (
    (fullRangeOffset - 1) * parsedColumnWidth +
    startRangeOffset * pixelsPerDayInStartMonth +
    endRangeOffset * pixelsPerDayInEndMonth
  );
};

const calculateInnerOffset = (
  date: Date,
  range: Range,
  columnWidth: number
) => {
  const startOf = getStartOf(range);
  const endOf = getEndOf(range);
  const differenceIn = getInnerDifferenceIn(range);
  const startOfRange = startOf(date);
  const endOfRange = endOf(date);
  const totalRangeDays = differenceIn(endOfRange, startOfRange);
  const dayOfMonth = date.getDate();

  return (dayOfMonth / totalRangeDays) * columnWidth;
};

const GanttContext = createContext<GanttContextProps>({
  zoom: 100,
  range: 'monthly',
  columnWidth: 50,
  headerHeight: 60,
  sidebarWidth: 300,
  rowHeight: 36,
  onAddItem: undefined,
  placeholderLength: 2,
  timelineData: [],
  ref: null,
});

export type GanttContentHeaderProps = {
  renderHeaderItem: (index: number) => ReactNode;
  title: string;
  columns: number;
};

export const GanttContentHeader: FC<GanttContentHeaderProps> = ({
  title,
  columns,
  renderHeaderItem,
}) => {
  const id = useId();

  return (
    <div
      className="sticky top-0 z-20 grid w-full shrink-0 bg-backdrop/90 backdrop-blur-sm"
      style={{ height: 'var(--gantt-header-height)' }}
    >
      <div>
        <div
          className="sticky inline-flex whitespace-nowrap px-3 py-2 text-muted-foreground text-xs"
          style={{
            left: 'var(--gantt-sidebar-width)',
          }}
        >
          <p>{title}</p>
        </div>
      </div>
      <div
        className="grid w-full"
        style={{
          gridTemplateColumns: `repeat(${columns}, var(--gantt-column-width))`,
        }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <div
            key={`${id}-${index}`}
            className="shrink-0 border-border/50 border-b py-1 text-center text-xs"
          >
            {renderHeaderItem(index)}
          </div>
        ))}
      </div>
    </div>
  );
};

const DailyHeader: FC = () => {
  const gantt = useContext(GanttContext);

  return gantt.timelineData.map((year) =>
    year.quarters
      .flatMap((quarter) => quarter.months)
      .map((month, index) => (
        <div className="relative flex flex-col" key={`${year.year}-${index}`}>
          <GanttContentHeader
            title={format(new Date(year.year, index, 1), 'MMMM yyyy')}
            columns={month.days}
            renderHeaderItem={(item: number) => (
              <div className="flex items-center justify-center gap-1">
                <p>
                  {format(addDays(new Date(year.year, index, 1), item), 'd')}
                </p>
                <p className="text-muted-foreground">
                  {format(
                    addDays(new Date(year.year, index, 1), item),
                    'EEEEE'
                  )}
                </p>
              </div>
            )}
          />
          <GanttColumns
            columns={month.days}
            isColumnSecondary={(item: number) =>
              [0, 6].includes(
                addDays(new Date(year.year, index, 1), item).getDay()
              )
            }
          />
        </div>
      ))
  );
};

const MonthlyHeader: FC = () => {
  const gantt = useContext(GanttContext);

  return gantt.timelineData.map((year) => (
    <div className="relative flex flex-col" key={year.year}>
      <GanttContentHeader
        title={`${year.year}`}
        columns={year.quarters.flatMap((quarter) => quarter.months).length}
        renderHeaderItem={(item: number) => (
          <p>{format(new Date(year.year, item, 1), 'MMM')}</p>
        )}
      />
      <GanttColumns
        columns={year.quarters.flatMap((quarter) => quarter.months).length}
      />
    </div>
  ));
};

const QuarterlyHeader: FC = () => {
  const gantt = useContext(GanttContext);

  return gantt.timelineData.map((year) =>
    year.quarters.map((quarter, quarterIndex) => (
      <div
        className="relative flex flex-col"
        key={`${year.year}-${quarterIndex}`}
      >
        <GanttContentHeader
          title={`Q${quarterIndex + 1} ${year.year}`}
          columns={quarter.months.length}
          renderHeaderItem={(item: number) => (
            <p>
              {format(new Date(year.year, quarterIndex * 3 + item, 1), 'MMM')}
            </p>
          )}
        />
        <GanttColumns columns={quarter.months.length} />
      </div>
    ))
  );
};

const headers: Record<Range, FC> = {
  daily: DailyHeader,
  monthly: MonthlyHeader,
  quarterly: QuarterlyHeader,
};

export type GanttHeaderProps = {
  className?: string;
};

export const GanttHeader: FC<GanttHeaderProps> = ({ className }) => {
  const gantt = useContext(GanttContext);
  const Header = headers[gantt.range];

  return (
    <div
      className={cn(
        '-space-x-px flex h-full w-max divide-x divide-border/50',
        className
      )}
    >
      <Header />
    </div>
  );
};

export type GanttSidebarItemProps = {
  feature: GanttFeature;
  onSelectItem?: (id: string) => void;
  className?: string;
};

export const GanttSidebarItem: FC<GanttSidebarItemProps> = ({
  feature,
  onSelectItem,
  className,
}) => {
  const tempEndAt =
    feature.endAt && isSameDay(feature.startAt, feature.endAt)
      ? addDays(feature.endAt, 1)
      : feature.endAt;
  const duration = tempEndAt
    ? formatDistance(feature.startAt, tempEndAt)
    : `${formatDistance(feature.startAt, new Date())} so far`;

  const handleClick: MouseEventHandler<HTMLDivElement> = (event) => {
    if (event.target === event.currentTarget) {
      onSelectItem?.(feature.id);
    }
  };

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.key === 'Enter') {
      onSelectItem?.(feature.id);
    }
  };

  return (
    <div
      // biome-ignore lint/a11y/useSemanticElements: <explanation>
      role="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      key={feature.id}
      className={cn(
        'relative flex items-center gap-2.5 p-2.5 text-xs',
        className
      )}
      style={{
        height: 'var(--gantt-row-height)',
      }}
    >
      {/* <Checkbox onCheckedChange={handleCheck} className="shrink-0" /> */}
      <div
        className="pointer-events-none h-2 w-2 shrink-0 rounded-full"
        style={{
          backgroundColor: feature.status.color,
        }}
      />
      <p className="pointer-events-none flex-1 truncate text-left font-medium">
        {feature.name}
      </p>
      <p className="pointer-events-none text-muted-foreground">{duration}</p>
    </div>
  );
};

export const GanttSidebarHeader: FC = () => (
  <div
    className="sticky top-0 z-10 flex shrink-0 items-end justify-between gap-2.5 border-border/50 border-b bg-backdrop/90 p-2.5 font-medium text-muted-foreground text-xs backdrop-blur-sm"
    style={{ height: 'var(--gantt-header-height)' }}
  >
    {/* <Checkbox className="shrink-0" /> */}
    <p className="flex-1 truncate text-left">Issues</p>
    <p className="shrink-0">Duration</p>
  </div>
);

export type GanttSidebarGroupProps = {
  children: ReactNode;
  name: string;
  className?: string;
};

export const GanttSidebarGroup: FC<GanttSidebarGroupProps> = ({
  children,
  name,
  className,
}) => (
  <div className={className}>
    <p
      style={{ height: 'var(--gantt-row-height)' }}
      className="w-full truncate p-2.5 text-left font-medium text-muted-foreground text-xs"
    >
      {name}
    </p>
    <div className="divide-y divide-border/50">{children}</div>
  </div>
);

export type GanttSidebarProps = {
  children: ReactNode;
  className?: string;
};

export const GanttSidebar: FC<GanttSidebarProps> = ({
  children,
  className,
}) => (
  <div
    data-roadmap-ui="gantt-sidebar"
    className={cn(
      'sticky left-0 z-30 h-max min-h-full overflow-clip border-border/50 border-r bg-background/90 backdrop-blur-md',
      className
    )}
  >
    <GanttSidebarHeader />
    <div className="space-y-4">{children}</div>
  </div>
);

export type GanttAddFeatureHelperProps = {
  top: number;
  className?: string;
};

export const GanttAddFeatureHelper: FC<GanttAddFeatureHelperProps> = ({
  top,
  className,
}) => {
  const [scrollX] = useGanttScrollX();
  const gantt = useContext(GanttContext);
  const [mousePosition, mouseRef] = useMouse<HTMLDivElement>();

  const handleClick = () => {
    const ganttRect = gantt.ref?.current?.getBoundingClientRect();
    const x =
      mousePosition.x - (ganttRect?.left ?? 0) + scrollX - gantt.sidebarWidth;
    const currentDate = getDateByMousePosition(gantt, x);

    gantt.onAddItem?.(currentDate);
  };

  return (
    <div
      className={cn('absolute top-0 w-full px-0.5', className)}
      style={{
        marginTop: -gantt.rowHeight / 2,
        transform: `translateY(${top}px)`,
      }}
      ref={mouseRef}
    >
      <button
        onClick={handleClick}
        type="button"
        className="flex h-full w-full items-center justify-center rounded-md border border-dashed p-2"
      >
        <PlusIcon
          size={16}
          className="pointer-events-none select-none text-muted-foreground"
        />
      </button>
    </div>
  );
};

export type GanttColumnProps = {
  index: number;
  isColumnSecondary?: (item: number) => boolean;
};

export const GanttColumn: FC<GanttColumnProps> = ({
  index,
  isColumnSecondary,
}) => {
  const gantt = useContext(GanttContext);
  const [dragging] = useGanttDragging();
  const [mousePosition, mouseRef] = useMouse<HTMLDivElement>();
  const [hovering, setHovering] = useState(false);
  const [windowScroll] = useWindowScroll();

  const handleMouseEnter = () => setHovering(true);
  const handleMouseLeave = () => setHovering(false);

  const top = useThrottle(
    mousePosition.y -
      (mouseRef.current?.getBoundingClientRect().y ?? 0) -
      (windowScroll.y ?? 0),
    10
  );

  return (
    // biome-ignore lint/nursery/noStaticElementInteractions: <explanation>
    <div
      className={cn(
        'group relative h-full overflow-hidden',
        isColumnSecondary?.(index) ? 'bg-secondary' : ''
      )}
      ref={mouseRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {!dragging && hovering && gantt.onAddItem ? (
        <GanttAddFeatureHelper top={top} />
      ) : null}
    </div>
  );
};

export type GanttColumnsProps = {
  columns: number;
  isColumnSecondary?: (item: number) => boolean;
};

export const GanttColumns: FC<GanttColumnsProps> = ({
  columns,
  isColumnSecondary,
}) => {
  const id = useId();

  return (
    <div
      className="divide grid h-full w-full divide-x divide-border/50"
      style={{
        gridTemplateColumns: `repeat(${columns}, var(--gantt-column-width))`,
      }}
    >
      {Array.from({ length: columns }).map((_, index) => (
        <GanttColumn
          key={`${id}-${index}`}
          index={index}
          isColumnSecondary={isColumnSecondary}
        />
      ))}
    </div>
  );
};

export type GanttCreateMarkerTriggerProps = {
  onCreateMarker: (date: Date) => void;
  className?: string;
};

export const GanttCreateMarkerTrigger: FC<GanttCreateMarkerTriggerProps> = ({
  onCreateMarker,
  className,
}) => {
  const gantt = useContext(GanttContext);
  const [mousePosition, mouseRef] = useMouse<HTMLDivElement>();
  const [windowScroll] = useWindowScroll();
  const x = useThrottle(
    mousePosition.x -
      (mouseRef.current?.getBoundingClientRect().x ?? 0) -
      (windowScroll.x ?? 0),
    10
  );

  const date = getDateByMousePosition(gantt, x);

  const handleClick = () => onCreateMarker(date);

  return (
    <div
      className={cn(
        'group pointer-events-none absolute top-0 left-0 h-full w-full select-none overflow-visible',
        className
      )}
      ref={mouseRef}
    >
      <div
        className="-ml-2 pointer-events-auto sticky top-6 z-20 flex w-4 flex-col items-center justify-center gap-1 overflow-visible opacity-0 group-hover:opacity-100"
        style={{ transform: `translateX(${x}px)` }}
      >
        <button
          type="button"
          className="z-50 inline-flex h-4 w-4 items-center justify-center rounded-full bg-card"
          onClick={handleClick}
        >
          <PlusIcon size={12} className="text-muted-foreground" />
        </button>
        <div className="whitespace-nowrap rounded-full border border-border/50 bg-background/90 px-2 py-1 text-foreground text-xs backdrop-blur-lg">
          {formatDate(date, 'MMM dd, yyyy')}
        </div>
      </div>
    </div>
  );
};

export type GanttFeatureDragHelperProps = {
  featureId: GanttFeature['id'];
  direction: 'left' | 'right';
  date: Date | null;
};

export const GanttFeatureDragHelper: FC<GanttFeatureDragHelperProps> = ({
  direction,
  featureId,
  date,
}) => {
  const [, setDragging] = useGanttDragging();
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `feature-drag-helper-${featureId}`,
  });

  const isPressed = Boolean(attributes['aria-pressed']);

  useEffect(() => setDragging(isPressed), [isPressed, setDragging]);

  return (
    <div
      className={cn(
        'group -translate-y-1/2 !cursor-col-resize absolute top-1/2 z-[3] h-full w-6 rounded-md outline-none',
        direction === 'left' ? '-left-2.5' : '-right-2.5'
      )}
      ref={setNodeRef}
      {...attributes}
      {...listeners}
    >
      <div
        className={cn(
          '-translate-y-1/2 absolute top-1/2 h-[80%] w-1 rounded-sm bg-muted-foreground opacity-0 transition-all',
          direction === 'left' ? 'left-2.5' : 'right-2.5',
          direction === 'left' ? 'group-hover:left-0' : 'group-hover:right-0',
          isPressed && (direction === 'left' ? 'left-0' : 'right-0'),
          'group-hover:opacity-100',
          isPressed && 'opacity-100'
        )}
      />
      {date && (
        <div
          className={cn(
            '-translate-x-1/2 absolute top-10 hidden whitespace-nowrap rounded-lg border border-border/50 bg-background/90 px-2 py-1 text-foreground text-xs backdrop-blur-lg group-hover:block',
            isPressed && 'block'
          )}
        >
          {format(date, 'MMM dd, yyyy')}
        </div>
      )}
    </div>
  );
};

export type GanttFeatureItemCardProps = Pick<GanttFeature, 'id'> & {
  children?: ReactNode;
};

export const GanttFeatureItemCard: FC<GanttFeatureItemCardProps> = ({
  id,
  children,
}) => {
  const [, setDragging] = useGanttDragging();
  const { attributes, listeners, setNodeRef } = useDraggable({ id });
  const isPressed = Boolean(attributes['aria-pressed']);

  useEffect(() => setDragging(isPressed), [isPressed, setDragging]);

  return (
    <Card className="h-full w-full rounded-md bg-background p-2 text-xs shadow-sm">
      <div
        className={cn(
          'flex h-full w-full items-center justify-between gap-2 text-left',
          isPressed && 'cursor-grabbing'
        )}
        {...attributes}
        {...listeners}
        ref={setNodeRef}
      >
        {children}
      </div>
    </Card>
  );
};

export type GanttFeatureItemProps = GanttFeature & {
  onMove?: (id: string, startDate: Date, endDate: Date | null) => void;
  children?: ReactNode;
  className?: string;
};

export const GanttFeatureItem: FC<GanttFeatureItemProps> = ({
  onMove,
  children,
  className,
  ...feature
}) => {
  const [scrollX] = useGanttScrollX();
  const gantt = useContext(GanttContext);
  const timelineStartDate = new Date(gantt.timelineData.at(0)?.year ?? 0, 0, 1);
  const [startAt, setStartAt] = useState<Date>(feature.startAt);
  const [endAt, setEndAt] = useState<Date | null>(feature.endAt);
  const width = getWidth(startAt, endAt, gantt);
  const offset = getOffset(startAt, timelineStartDate, gantt);
  const addRange = getAddRange(gantt.range);
  const [mousePosition] = useMouse<HTMLDivElement>();

  const [previousMouseX, setPreviousMouseX] = useState(0);
  const [previousStartAt, setPreviousStartAt] = useState(startAt);
  const [previousEndAt, setPreviousEndAt] = useState(endAt);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });

  const handleItemDragStart = () => {
    setPreviousMouseX(mousePosition.x);
    setPreviousStartAt(startAt);
    setPreviousEndAt(endAt);
  };

  const handleItemDragMove = () => {
    const currentDate = getDateByMousePosition(gantt, mousePosition.x);
    const originalDate = getDateByMousePosition(gantt, previousMouseX);
    const delta =
      gantt.range === 'daily'
        ? getDifferenceIn(gantt.range)(currentDate, originalDate)
        : getInnerDifferenceIn(gantt.range)(currentDate, originalDate);
    const newStartDate = addDays(previousStartAt, delta);
    const newEndDate = previousEndAt ? addDays(previousEndAt, delta) : null;

    setStartAt(newStartDate);
    setEndAt(newEndDate);
  };

  const onDragEnd = () => onMove?.(feature.id, startAt, endAt);
  const handleLeftDragMove = () => {
    const ganttRect = gantt.ref?.current?.getBoundingClientRect();
    const x =
      mousePosition.x - (ganttRect?.left ?? 0) + scrollX - gantt.sidebarWidth;
    const newStartAt = getDateByMousePosition(gantt, x);

    setStartAt(newStartAt);
  };
  const handleRightDragMove = () => {
    const ganttRect = gantt.ref?.current?.getBoundingClientRect();
    const x =
      mousePosition.x - (ganttRect?.left ?? 0) + scrollX - gantt.sidebarWidth;
    const newEndAt = getDateByMousePosition(gantt, x);

    setEndAt(newEndAt);
  };

  return (
    <div
      className={cn('relative flex w-max min-w-full py-0.5', className)}
      style={{ height: 'var(--gantt-row-height)' }}
    >
      <div
        className="pointer-events-auto absolute top-0.5"
        style={{
          height: 'calc(var(--gantt-row-height) - 4px)',
          width: Math.round(width),
          left: Math.round(offset),
        }}
      >
        {onMove && (
          <DndContext
            sensors={[mouseSensor]}
            modifiers={[restrictToHorizontalAxis]}
            onDragMove={handleLeftDragMove}
            onDragEnd={onDragEnd}
          >
            <GanttFeatureDragHelper
              direction="left"
              featureId={feature.id}
              date={startAt}
            />
          </DndContext>
        )}
        <DndContext
          sensors={[mouseSensor]}
          modifiers={[restrictToHorizontalAxis]}
          onDragStart={handleItemDragStart}
          onDragMove={handleItemDragMove}
          onDragEnd={onDragEnd}
        >
          <GanttFeatureItemCard id={feature.id}>
            {children ?? (
              <p className="flex-1 truncate text-xs">{feature.name}</p>
            )}
          </GanttFeatureItemCard>
        </DndContext>
        {onMove && (
          <DndContext
            sensors={[mouseSensor]}
            modifiers={[restrictToHorizontalAxis]}
            onDragMove={handleRightDragMove}
            onDragEnd={onDragEnd}
          >
            <GanttFeatureDragHelper
              direction="right"
              featureId={feature.id}
              date={endAt ?? addRange(startAt, 2)}
            />
          </DndContext>
        )}
      </div>
    </div>
  );
};

export type GanttFeatureListGroupProps = {
  children: ReactNode;
  className?: string;
};

export const GanttFeatureListGroup: FC<GanttFeatureListGroupProps> = ({
  children,
  className,
}) => (
  <div className={className} style={{ paddingTop: 'var(--gantt-row-height)' }}>
    {children}
  </div>
);

export type GanttFeatureListProps = {
  className?: string;
  children: ReactNode;
};

export const GanttFeatureList: FC<GanttFeatureListProps> = ({
  className,
  children,
}) => (
  <div
    className={cn('absolute top-0 left-0 h-full w-max space-y-4', className)}
    style={{ marginTop: 'var(--gantt-header-height)' }}
  >
    {children}
  </div>
);

export const GanttMarker: FC<
  GanttMarkerProps & {
    onRemove?: (id: string) => void;
    className?: string;
  }
> = ({ label, date, id, onRemove, className }) => {
  const gantt = useContext(GanttContext);
  const differenceIn = getDifferenceIn(gantt.range);
  const timelineStartDate = new Date(gantt.timelineData.at(0)?.year ?? 0, 0, 1);
  const offset = differenceIn(date, timelineStartDate);
  const innerOffset = calculateInnerOffset(
    date,
    gantt.range,
    (gantt.columnWidth * gantt.zoom) / 100
  );
  const handleRemove = () => onRemove?.(id);

  return (
    <div
      className="pointer-events-none absolute top-0 left-0 z-20 flex h-full select-none flex-col items-center justify-center overflow-visible"
      style={{
        width: 0,
        transform: `translateX(calc(var(--gantt-column-width) * ${offset} + ${innerOffset}px))`,
      }}
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn(
              'group pointer-events-auto sticky top-0 flex select-auto flex-col flex-nowrap items-center justify-center whitespace-nowrap rounded-b-md bg-card px-2 py-1 text-foreground text-xs',
              className
            )}
          >
            {label}
            <span className="max-h-[0] overflow-hidden opacity-80 transition-all group-hover:max-h-[2rem]">
              {formatDate(date, 'MMM dd, yyyy')}
            </span>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {onRemove ? (
            <ContextMenuItem
              className="flex items-center gap-2 text-destructive"
              onClick={handleRemove}
            >
              <TrashIcon size={16} />
              Remove marker
            </ContextMenuItem>
          ) : null}
        </ContextMenuContent>
      </ContextMenu>
      <div className={cn('h-full w-px bg-card', className)} />
    </div>
  );
};

export type GanttProviderProps = {
  range?: Range;
  zoom?: number;
  onAddItem?: (date: Date) => void;
  children: ReactNode;
  className?: string;
};

export const GanttProvider: FC<GanttProviderProps> = ({
  zoom = 100,
  range = 'monthly',
  onAddItem,
  children,
  className,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [timelineData, setTimelineData] = useState<TimelineData>(
    createInitialTimelineData(new Date())
  );
  const [, setScrollX] = useGanttScrollX();
  const sidebarElement = scrollRef.current?.querySelector(
    '[data-roadmap-ui="gantt-sidebar"]'
  );

  const headerHeight = 60;
  const sidebarWidth = sidebarElement ? 300 : 0;
  const rowHeight = 36;
  let columnWidth = 50;

  if (range === 'monthly') {
    columnWidth = 150;
  } else if (range === 'quarterly') {
    columnWidth = 100;
  }

  const cssVariables = {
    '--gantt-zoom': `${zoom}`,
    '--gantt-column-width': `${(zoom / 100) * columnWidth}px`,
    '--gantt-header-height': `${headerHeight}px`,
    '--gantt-row-height': `${rowHeight}px`,
    '--gantt-sidebar-width': `${sidebarWidth}px`,
  } as CSSProperties;

  // biome-ignore lint/correctness/useExhaustiveDependencies: Re-render when props change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft =
        scrollRef.current.scrollWidth / 2 - scrollRef.current.clientWidth / 2;
      setScrollX(scrollRef.current.scrollLeft);
    }
  }, [range, zoom, setScrollX]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: "Throttled"
  const handleScroll = useCallback(
    throttle(() => {
      if (!scrollRef.current) {
        return;
      }

      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setScrollX(scrollLeft);

      if (scrollLeft === 0) {
        // Extend timelineData to the past
        const firstYear = timelineData[0]?.year;

        if (!firstYear) {
          return;
        }

        const newTimelineData: TimelineData = [...timelineData];
        newTimelineData.unshift({
          year: firstYear - 1,
          quarters: new Array(4).fill(null).map((_, quarterIndex) => ({
            months: new Array(3).fill(null).map((_, monthIndex) => {
              const month = quarterIndex * 3 + monthIndex;
              return {
                days: getDaysInMonth(new Date(firstYear, month, 1)),
              };
            }),
          })),
        });

        setTimelineData(newTimelineData);

        // Scroll a bit forward so it's not at the very start
        scrollRef.current.scrollLeft = scrollRef.current.clientWidth;
        setScrollX(scrollRef.current.scrollLeft);
      } else if (scrollLeft + clientWidth >= scrollWidth) {
        // Extend timelineData to the future
        const lastYear = timelineData.at(-1)?.year;

        if (!lastYear) {
          return;
        }

        const newTimelineData: TimelineData = [...timelineData];
        newTimelineData.push({
          year: lastYear + 1,
          quarters: new Array(4).fill(null).map((_, quarterIndex) => ({
            months: new Array(3).fill(null).map((_, monthIndex) => {
              const month = quarterIndex * 3 + monthIndex;
              return {
                days: getDaysInMonth(new Date(lastYear, month, 1)),
              };
            }),
          })),
        });

        setTimelineData(newTimelineData);

        // Scroll a bit back so it's not at the very end
        scrollRef.current.scrollLeft =
          scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
        setScrollX(scrollRef.current.scrollLeft);
      }
    }, 100),
    [timelineData, setScrollX]
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (scrollRef.current) {
        scrollRef.current.removeEventListener('scroll', handleScroll);
      }
    };
  }, [handleScroll]);

  return (
    <GanttContext.Provider
      value={{
        zoom,
        range,
        headerHeight,
        columnWidth,
        sidebarWidth,
        rowHeight,
        onAddItem,
        timelineData,
        placeholderLength: 2,
        ref: scrollRef,
      }}
    >
      <div
        className={cn(
          'gantt relative grid h-full w-full flex-none select-none overflow-auto rounded-sm bg-secondary',
          range,
          className
        )}
        style={{
          ...cssVariables,
          gridTemplateColumns: 'var(--gantt-sidebar-width) 1fr',
        }}
        ref={scrollRef}
      >
        {children}
      </div>
    </GanttContext.Provider>
  );
};

export type GanttTimelineProps = {
  children: ReactNode;
  className?: string;
};

export const GanttTimeline: FC<GanttTimelineProps> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      'relative flex h-full w-max flex-none overflow-clip',
      className
    )}
  >
    {children}
  </div>
);

export type GanttTodayProps = {
  className?: string;
};

export const GanttToday: FC<GanttTodayProps> = ({ className }) => {
  const label = 'Today';
  const date = new Date();
  const gantt = useContext(GanttContext);
  const differenceIn = getDifferenceIn(gantt.range);
  const timelineStartDate = new Date(gantt.timelineData.at(0)?.year ?? 0, 0, 1);
  const offset = differenceIn(date, timelineStartDate);
  const innerOffset = calculateInnerOffset(
    date,
    gantt.range,
    (gantt.columnWidth * gantt.zoom) / 100
  );

  return (
    <div
      className="pointer-events-none absolute top-0 left-0 z-20 flex h-full select-none flex-col items-center justify-center overflow-visible"
      style={{
        width: 0,
        transform: `translateX(calc(var(--gantt-column-width) * ${offset} + ${innerOffset}px))`,
      }}
    >
      <div
        className={cn(
          'group pointer-events-auto sticky top-0 flex select-auto flex-col flex-nowrap items-center justify-center whitespace-nowrap rounded-b-md bg-card px-2 py-1 text-foreground text-xs',
          className
        )}
      >
        {label}
        <span className="max-h-[0] overflow-hidden opacity-80 transition-all group-hover:max-h-[2rem]">
          {formatDate(date, 'MMM dd, yyyy')}
        </span>
      </div>
      <div className={cn('h-full w-px bg-card', className)} />
    </div>
  );
};


demo.tsx
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  GanttCreateMarkerTrigger,
  GanttFeatureItem,
  GanttFeatureList,
  GanttFeatureListGroup,
  GanttHeader,
  GanttMarker,
  GanttProvider,
  GanttSidebar,
  GanttSidebarGroup,
  GanttSidebarItem,
  GanttTimeline,
  GanttToday,
} from '@/components/ui/gantt';
import { EyeIcon, LinkIcon, TrashIcon } from 'lucide-react';
import { useState } from 'react';

import {
  addMonths,
  endOfMonth,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';
const today = new Date();

const exampleStatuses = [
  { id: '1', name: 'Planned', color: '#6B7280' },
  { id: '2', name: 'In Progress', color: '#F59E0B' }, 
  { id: '3', name: 'Done', color: '#10B981' },
];

const exampleFeatures = [
  {
    id: '1',
    name: 'AI Scene Analysis',
    startAt: startOfMonth(subMonths(today, 6)),
    endAt: subDays(endOfMonth(today), 5),
    status: exampleStatuses[0],
    group: { id: '1', name: 'Core AI Features' },
    product: { id: '1', name: 'Video Editor Pro' },
    owner: {
      id: '1',
      image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=1',
      name: 'Alice Johnson',
    },
    initiative: { id: '1', name: 'AI Integration' },
    release: { id: '1', name: 'v1.0' },
  },
  {
    id: '2',
    name: 'Collaborative Editing',
    startAt: startOfMonth(subMonths(today, 5)),
    endAt: subDays(endOfMonth(today), 5),
    status: exampleStatuses[1],
    group: { id: '2', name: 'Collaboration Tools' },
    product: { id: '1', name: 'Video Editor Pro' },
    owner: {
      id: '2',
      image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=2',
      name: 'Bob Smith',
    },
    initiative: { id: '2', name: 'Real-time Collaboration' },
    release: { id: '1', name: 'v1.0' },
  },
  {
    id: '3',
    name: 'AI-Powered Color Grading',
    startAt: startOfMonth(subMonths(today, 4)),
    endAt: subDays(endOfMonth(today), 5),
    status: exampleStatuses[2],
    group: { id: '1', name: 'Core AI Features' },
    product: { id: '1', name: 'Video Editor Pro' },
    owner: {
      id: '3',
      image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=3',
      name: 'Charlie Brown',
    },
    initiative: { id: '1', name: 'AI Integration' },
    release: { id: '2', name: 'v1.1' },
  },
  {
    id: '4',
    name: 'Real-time Video Chat',
    startAt: startOfMonth(subMonths(today, 3)),
    endAt: subDays(endOfMonth(today), 12),
    status: exampleStatuses[0],
    group: { id: '2', name: 'Collaboration Tools' },
    product: { id: '1', name: 'Video Editor Pro' },
    owner: {
      id: '4',
      image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=4',
      name: 'Diana Prince',
    },
    initiative: { id: '2', name: 'Real-time Collaboration' },
    release: { id: '2', name: 'v1.1' },
  },
  {
    id: '5',
    name: 'AI Voice-to-Text Subtitles',
    startAt: startOfMonth(subMonths(today, 2)),
    endAt: subDays(endOfMonth(today), 5),
    status: exampleStatuses[1],
    group: { id: '1', name: 'Core AI Features' },
    product: { id: '1', name: 'Video Editor Pro' },
    owner: {
      id: '5',
      image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=5',
      name: 'Ethan Hunt',
    },
    initiative: { id: '1', name: 'AI Integration' },
    release: { id: '2', name: 'v1.1' },
  },
  {
    id: '6',
    name: 'Cloud Asset Management',
    startAt: startOfMonth(subMonths(today, 1)),
    endAt: endOfMonth(today),
    status: exampleStatuses[2],
    group: { id: '3', name: 'Cloud Infrastructure' },
    product: { id: '1', name: 'Video Editor Pro' },
    owner: {
      id: '6',
      image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=6',
      name: 'Fiona Gallagher',
    },
    initiative: { id: '3', name: 'Cloud Migration' },
    release: { id: '3', name: 'v1.2' },
  },
  {
    id: '7',
    name: 'AI-Assisted Video Transitions',
    startAt: startOfMonth(today),
    endAt: endOfMonth(addMonths(today, 1)),
    status: exampleStatuses[0],
    group: { id: '1', name: 'Core AI Features' },
    product: { id: '1', name: 'Video Editor Pro' },
    owner: {
      id: '7',
      image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=7',
      name: 'George Lucas',
    },
    initiative: { id: '1', name: 'AI Integration' },
    release: { id: '3', name: 'v1.2' },
  },
  {
    id: '8',
    name: 'Version Control System',
    startAt: startOfMonth(addMonths(today, 1)),
    endAt: endOfMonth(addMonths(today, 2)),
    status: exampleStatuses[1],
    group: { id: '2', name: 'Collaboration Tools' },
    product: { id: '1', name: 'Video Editor Pro' },
    owner: {
      id: '8',
      image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=8',
      name: 'Hannah Montana',
    },
    initiative: { id: '2', name: 'Real-time Collaboration' },
    release: { id: '3', name: 'v1.2' },
  },
  {
    id: '9',
    name: 'AI Content-Aware Fill',
    startAt: startOfMonth(addMonths(today, 2)),
    endAt: endOfMonth(addMonths(today, 3)),
    status: exampleStatuses[2],
    group: { id: '1', name: 'Core AI Features' },
    product: { id: '1', name: 'Video Editor Pro' },
    owner: {
      id: '9',
      image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=9',
      name: 'Ian Malcolm',
    },
    initiative: { id: '1', name: 'AI Integration' },
    release: { id: '4', name: 'v1.3' },
  },
  {
    id: '10',
    name: 'Multi-User Permissions',
    startAt: startOfMonth(addMonths(today, 3)),
    endAt: endOfMonth(addMonths(today, 4)),
    status: exampleStatuses[0],
    group: { id: '2', name: 'Collaboration Tools' },
    product: { id: '1', name: 'Video Editor Pro' },
    owner: {
      id: '10',
      image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=10',
      name: 'Julia Roberts',
    },
    initiative: { id: '2', name: 'Real-time Collaboration' },
    release: { id: '4', name: 'v1.3' },
  },
  {
    id: '11',
    name: 'AI-Powered Audio Enhancement',
    startAt: startOfMonth(addMonths(today, 4)),
    endAt: endOfMonth(addMonths(today, 5)),
    status: exampleStatuses[1],
    group: { id: '1', name: 'Core AI Features' },
    product: { id: '1', name: 'Video Editor Pro' },
    owner: {
      id: '11',
      image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=11',
      name: 'Kevin Hart',
    },
    initiative: { id: '1', name: 'AI Integration' },
    release: { id: '4', name: 'v1.3' },
  },
  {
    id: '12',
    name: 'Real-time Project Analytics',
    startAt: startOfMonth(addMonths(today, 5)),
    endAt: endOfMonth(addMonths(today, 6)),
    status: exampleStatuses[2],
    group: { id: '3', name: 'Cloud Infrastructure' },
    product: { id: '1', name: 'Video Editor Pro' },
    owner: {
      id: '12',
      image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=12',
      name: 'Lara Croft',
    },
    initiative: { id: '3', name: 'Cloud Migration' },
    release: { id: '5', name: 'v1.4' },
  },
  {
    id: '13',
    name: 'AI Scene Recommendations',
    startAt: startOfMonth(addMonths(today, 6)),
    endAt: endOfMonth(addMonths(today, 7)),
    status: exampleStatuses[0],
    group: { id: '1', name: 'Core AI Features' },
    product: { id: '1', name: 'Video Editor Pro' },
    owner: {
      id: '13',
      image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=13',
      name: 'Michael Scott',
    },
    initiative: { id: '1', name: 'AI Integration' },
    release: { id: '5', name: 'v1.4' },
  },
  {
    id: '14',
    name: 'Collaborative Storyboarding',
    startAt: startOfMonth(addMonths(today, 7)),
    endAt: endOfMonth(addMonths(today, 8)),
    status: exampleStatuses[1],
    group: { id: '2', name: 'Collaboration Tools' },
    product: { id: '1', name: 'Video Editor Pro' },
    owner: {
      id: '14',
      image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=14',
      name: 'Natalie Portman',
    },
    initiative: { id: '2', name: 'Real-time Collaboration' },
    release: { id: '5', name: 'v1.4' },
  },
  {
    id: '15',
    name: 'AI-Driven Video Compression',
    startAt: startOfMonth(addMonths(today, 8)),
    endAt: endOfMonth(addMonths(today, 9)),
    status: exampleStatuses[2],
    group: { id: '1', name: 'Core AI Features' },
    product: { id: '1', name: 'Video Editor Pro' },
    owner: {
      id: '15',
      image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=15',
      name: 'Oscar Isaac',
    },
    initiative: { id: '1', name: 'AI Integration' },
    release: { id: '6', name: 'v1.5' },
  },
  {
    id: '16',
    name: 'Global CDN Integration',
    startAt: startOfMonth(addMonths(today, 9)),
    endAt: endOfMonth(addMonths(today, 10)),
    status: exampleStatuses[0],
    group: { id: '3', name: 'Cloud Infrastructure' },
    product: { id: '1', name: 'Video Editor Pro' },
    owner: {
      id: '16',
      image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=16',
      name: 'Penelope Cruz',
    },
    initiative: { id: '3', name: 'Cloud Migration' },
    release: { id: '6', name: 'v1.5' },
  },
  {
    id: '17',
    name: 'AI Object Tracking',
    startAt: startOfMonth(addMonths(today, 10)),
    endAt: endOfMonth(addMonths(today, 11)),
    status: exampleStatuses[1],
    group: { id: '1', name: 'Core AI Features' },
    product: { id: '1', name: 'Video Editor Pro' },
    owner: {
      id: '17',
      image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=17',
      name: 'Quentin Tarantino',
    },
    initiative: { id: '1', name: 'AI Integration' },
    release: { id: '6', name: 'v1.5' },
  },
  {
    id: '18',
    name: 'Real-time Language Translation',
    startAt: startOfMonth(addMonths(today, 11)),
    endAt: endOfMonth(addMonths(today, 12)),
    status: exampleStatuses[2],
    group: { id: '2', name: 'Collaboration Tools' },
    product: { id: '1', name: 'Video Editor Pro' },
    owner: {
      id: '18',
      image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=18',
      name: 'Rachel Green',
    },
    initiative: { id: '2', name: 'Real-time Collaboration' },
    release: { id: '7', name: 'v1.6' },
  },
  {
    id: '19',
    name: 'AI-Powered Video Summarization',
    startAt: startOfMonth(addMonths(today, 12)),
    endAt: endOfMonth(addMonths(today, 13)),
    status: exampleStatuses[0],
    group: { id: '1', name: 'Core AI Features' },
    product: { id: '1', name: 'Video Editor Pro' },
    owner: {
      id: '19',
      image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=19',
      name: 'Samuel L. Jackson',
    },
    initiative: { id: '1', name: 'AI Integration' },
    release: { id: '7', name: 'v1.6' },
  },
  {
    id: '20',
    name: 'Blockchain-based Asset Licensing',
    startAt: startOfMonth(addMonths(today, 13)),
    endAt: endOfMonth(addMonths(today, 14)),
    status: exampleStatuses[1],
    group: { id: '3', name: 'Cloud Infrastructure' },
    product: { id: '1', name: 'Video Editor Pro' },
    owner: {
      id: '20',
      image: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=20',
      name: 'Tom Hanks',
    },
    initiative: { id: '3', name: 'Cloud Migration' },
    release: { id: '7', name: 'v1.6' },
  },
];

const exampleMarkers = [
  {
    id: '1',
    date: startOfMonth(subMonths(today, 3)),
    label: 'Project Kickoff',
    className: 'bg-blue-100 text-blue-900',
  },
  {
    id: '2',
    date: subMonths(endOfMonth(today), 2),
    label: 'Phase 1 Completion',
    className: 'bg-green-100 text-green-900',
  },
  {
    id: '3',
    date: startOfMonth(addMonths(today, 3)),
    label: 'Beta Release',
    className: 'bg-purple-100 text-purple-900',
  },
  {
    id: '4',
    date: endOfMonth(addMonths(today, 6)),
    label: 'Version 1.0 Launch',
    className: 'bg-red-100 text-red-900',
  },
  {
    id: '5',
    date: startOfMonth(addMonths(today, 9)),
    label: 'User Feedback Review',
    className: 'bg-orange-100 text-orange-900',
  },
  {
    id: '6',
    date: endOfMonth(addMonths(today, 12)),
    label: 'Annual Performance Evaluation',
    className: 'bg-teal-100 text-teal-900',
  },
];

const Demo = () => {
  const [features, setFeatures] = useState(exampleFeatures);

  const groupedFeatures: Record<string, typeof features> = features.reduce<
    Record<string, typeof features>
  >((groups, feature) => {
    const groupName = feature.group.name;
    return {
        ...groups,
        [groupName]: [...(groups[groupName] || []), feature],
      };
    },
    {}
  );

  const sortedGroupedFeatures = Object.fromEntries(
    Object.entries(groupedFeatures).sort(([nameA], [nameB]) =>
      nameA.localeCompare(nameB)
    )
  );

  const handleViewFeature = (id: string) =>
    console.log(`Feature selected: ${id}`);

  const handleCopyLink = (id: string) => console.log(`Copy link: ${id}`);

  const handleRemoveFeature = (id: string) =>
    setFeatures((prev) => prev.filter((feature) => feature.id !== id));

  const handleRemoveMarker = (id: string) =>
    console.log(`Remove marker: ${id}`);

  const handleCreateMarker = (date: Date) =>
    console.log(`Create marker: ${date.toISOString()}`);

  const handleMoveFeature = (id: string, startAt: Date, endAt: Date | null) => {
    if (!endAt) {
      return;
    }

    setFeatures((prev) =>
      prev.map((feature) =>
        feature.id === id ? { ...feature, startAt, endAt } : feature
      )
    );

    console.log(`Move feature: ${id} from ${startAt} to ${endAt}`);
  };

  const handleAddFeature = (date: Date) =>
    console.log(`Add feature: ${date.toISOString()}`);

  return (
    <GanttProvider onAddItem={handleAddFeature} range="monthly" zoom={100} className="h-[500px] border">
      <GanttSidebar>
        {Object.entries(sortedGroupedFeatures).map(([group, features]) => (
          <GanttSidebarGroup key={group} name={group}>
            {features.map((feature) => (
              <GanttSidebarItem
                key={feature.id}
                feature={feature}
                onSelectItem={handleViewFeature}
              />
            ))}
          </GanttSidebarGroup>
        ))}
      </GanttSidebar>
      <GanttTimeline>
        <GanttHeader />
        <GanttFeatureList>
          {Object.entries(sortedGroupedFeatures).map(([group, features]) => (
            <GanttFeatureListGroup key={group}>
              {features.map((feature) => (
                <div className="flex" key={feature.id}>
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={() => handleViewFeature(feature.id)}
                      >
                        <GanttFeatureItem
                          onMove={handleMoveFeature}
                          {...feature}
                        />
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        className="flex items-center gap-2"
                        onClick={() => handleViewFeature(feature.id)}
                      >
                        <EyeIcon size={16} className="text-muted-foreground" />
                        View feature
                      </ContextMenuItem>
                      <ContextMenuItem
                        className="flex items-center gap-2"
                        onClick={() => handleCopyLink(feature.id)}
                      >
                        <LinkIcon size={16} className="text-muted-foreground" />
                        Copy link
                      </ContextMenuItem>
                      <ContextMenuItem
                        className="flex items-center gap-2 text-destructive"
                        onClick={() => handleRemoveFeature(feature.id)}
                      >
                        <TrashIcon size={16} />
                        Remove from roadmap
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                </div>
              ))}
            </GanttFeatureListGroup>
          ))}
        </GanttFeatureList>
        {exampleMarkers.map((marker) => (
          <GanttMarker
            key={marker.id}
            {...marker}
            onRemove={handleRemoveMarker}
          />
        ))}
        <GanttToday />
        <GanttCreateMarkerTrigger onCreateMarker={handleCreateMarker} />
      </GanttTimeline>
    </GanttProvider>
  );
}
  
export default { Demo }
```

Copy-paste these files for dependencies:
```tsx
shadcn/card
import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className,
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

```
```tsx
shadcn/context-menu
"use client"

import * as React from "react"
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu"
import { Check, ChevronRight, Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const ContextMenu = ContextMenuPrimitive.Root

const ContextMenuTrigger = ContextMenuPrimitive.Trigger

const ContextMenuGroup = ContextMenuPrimitive.Group

const ContextMenuPortal = ContextMenuPrimitive.Portal

const ContextMenuSub = ContextMenuPrimitive.Sub

const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup

const ContextMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & {
    inset?: boolean
  }
>(({ className, inset, children, ...props }, ref) => (
  <ContextMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </ContextMenuPrimitive.SubTrigger>
))
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName

const ContextMenuSubContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className,
    )}
    {...props}
  />
))
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName

const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Portal>
    <ContextMenuPrimitive.Content
      ref={ref}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </ContextMenuPrimitive.Portal>
))
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName

const ContextMenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
))
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName

const ContextMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <ContextMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.CheckboxItem>
))
ContextMenuCheckboxItem.displayName =
  ContextMenuPrimitive.CheckboxItem.displayName

const ContextMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <ContextMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <Circle className="h-2 w-2 fill-current" />
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </ContextMenuPrimitive.RadioItem>
))
ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName

const ContextMenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & {
    inset?: boolean
  }
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-sm font-semibold text-foreground",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
))
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName

const ContextMenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
))
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName

const ContextMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground",
        className,
      )}
      {...props}
    />
  )
}
ContextMenuShortcut.displayName = "ContextMenuShortcut"

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
}

```

Install NPM dependencies:
```bash
lucide-react, @radix-ui/react-context-menu
```

Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them

You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure  
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
```tsx
kanban.tsx
'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  DndContext,
  rectIntersection,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import type { ReactNode } from 'react';

export type Status = {
  id: string;
  name: string;
  color: string;
};

export type Feature = {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date;
  status: Status;
};

export type KanbanBoardProps = {
  id: Status['id'];
  children: ReactNode;
  className?: string;
};

export const KanbanBoard = ({ id, children, className }: KanbanBoardProps) => {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      className={cn(
        'flex h-full min-h-40 flex-col gap-2 rounded-md border bg-secondary p-2 text-xs shadow-sm outline outline-2 transition-all',
        isOver ? 'outline-primary' : 'outline-transparent',
        className
      )}
      ref={setNodeRef}
    >
      {children}
    </div>
  );
};

export type KanbanCardProps = Pick<Feature, 'id' | 'name'> & {
  index: number;
  parent: string;
  children?: ReactNode;
  className?: string;
};

export const KanbanCard = ({
  id,
  name,
  index,
  parent,
  children,
  className,
}: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      data: { index, parent },
    });

  return (
    <Card
      className={cn(
        'rounded-md p-3 shadow-sm',
        isDragging && 'cursor-grabbing',
        className
      )}
      style={{
        transform: transform
          ? `translateX(${transform.x}px) translateY(${transform.y}px)`
          : 'none',
      }}
      {...listeners}
      {...attributes}
      ref={setNodeRef}
    >
      {children ?? <p className="m-0 font-medium text-sm">{name}</p>}
    </Card>
  );
};

export type KanbanCardsProps = {
  children: ReactNode;
  className?: string;
};

export const KanbanCards = ({ children, className }: KanbanCardsProps) => (
  <div className={cn('flex flex-1 flex-col gap-2', className)}>{children}</div>
);

export type KanbanHeaderProps =
  | {
      children: ReactNode;
    }
  | {
      name: Status['name'];
      color: Status['color'];
      className?: string;
    };

export const KanbanHeader = (props: KanbanHeaderProps) =>
  'children' in props ? (
    props.children
  ) : (
    <div className={cn('flex shrink-0 items-center gap-2', props.className)}>
      <div
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: props.color }}
      />
      <p className="m-0 font-semibold text-sm">{props.name}</p>
    </div>
  );

export type KanbanProviderProps = {
  children: ReactNode;
  onDragEnd: (event: DragEndEvent) => void;
  className?: string;
};

export const KanbanProvider = ({
  children,
  onDragEnd,
  className,
}: KanbanProviderProps) => (
  <DndContext collisionDetection={rectIntersection} onDragEnd={onDragEnd}>
    <div
      className={cn('grid w-full auto-cols-fr grid-flow-col gap-4', className)}
    >
      {children}
    </div>
  </DndContext>
);


demo.tsx
'use client';
 
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
} from '@/components/ui/kanban';
import type { DragEndEvent } from '@dnd-kit/core';
import { format, addMonths, endOfMonth, startOfMonth, subDays, subMonths } from 'date-fns';
import { useState } from 'react';
import type { FC } from 'react';

const today = new Date();

const exampleStatuses = [
  { id: "1", name: "Planned", color: "#6B7280" },
  { id: "2", name: "In Progress", color: "#F59E0B" },
  { id: "3", name: "Done", color: "#10B981" },
]

const exampleFeatures = [
  {
    id: "1",
    name: "AI Scene Analysis",
    startAt: startOfMonth(subMonths(today, 6)),
    endAt: subDays(endOfMonth(today), 5),
    status: exampleStatuses[0],
    group: { id: "1", name: "Core AI Features" },
    product: { id: "1", name: "Video Editor Pro" },
    owner: {
      id: "1",
      image: "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=1",
      name: "Alice Johnson",
    },
    initiative: { id: "1", name: "AI Integration" },
    release: { id: "1", name: "v1.0" },
  },
  {
    id: "2",
    name: "Collaborative Editing",
    startAt: startOfMonth(subMonths(today, 5)),
    endAt: subDays(endOfMonth(today), 5),
    status: exampleStatuses[1],
    group: { id: "2", name: "Collaboration Tools" },
    product: { id: "1", name: "Video Editor Pro" },
    owner: {
      id: "2",
      image: "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=2",
      name: "Bob Smith",
    },
    initiative: { id: "2", name: "Real-time Collaboration" },
    release: { id: "1", name: "v1.0" },
  },
  {
    id: "3",
    name: "AI-Powered Color Grading",
    startAt: startOfMonth(subMonths(today, 4)),
    endAt: subDays(endOfMonth(today), 5),
    status: exampleStatuses[2],
    group: { id: "1", name: "Core AI Features" },
    product: { id: "1", name: "Video Editor Pro" },
    owner: {
      id: "3",
      image: "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=3",
      name: "Charlie Brown",
    },
    initiative: { id: "1", name: "AI Integration" },
    release: { id: "2", name: "v1.1" },
  },
  {
    id: "4",
    name: "Real-time Video Chat",
    startAt: startOfMonth(subMonths(today, 3)),
    endAt: subDays(endOfMonth(today), 12),
    status: exampleStatuses[0],
    group: { id: "2", name: "Collaboration Tools" },
    product: { id: "1", name: "Video Editor Pro" },
    owner: {
      id: "4",
      image: "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=4",
      name: "Diana Prince",
    },
    initiative: { id: "2", name: "Real-time Collaboration" },
    release: { id: "2", name: "v1.1" },
  },
  {
    id: "5",
    name: "AI Voice-to-Text Subtitles",
    startAt: startOfMonth(subMonths(today, 2)),
    endAt: subDays(endOfMonth(today), 5),
    status: exampleStatuses[1],
    group: { id: "1", name: "Core AI Features" },
    product: { id: "1", name: "Video Editor Pro" },
    owner: {
      id: "5",
      image: "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=5",
      name: "Ethan Hunt",
    },
    initiative: { id: "1", name: "AI Integration" },
    release: { id: "2", name: "v1.1" },
  },
  {
    id: "6",
    name: "Cloud Asset Management",
    startAt: startOfMonth(subMonths(today, 1)),
    endAt: endOfMonth(today),
    status: exampleStatuses[2],
    group: { id: "3", name: "Cloud Infrastructure" },
    product: { id: "1", name: "Video Editor Pro" },
    owner: {
      id: "6",
      image: "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=6",
      name: "Fiona Gallagher",
    },
    initiative: { id: "3", name: "Cloud Migration" },
    release: { id: "3", name: "v1.2" },
  },
  {
    id: "7",
    name: "AI-Assisted Video Transitions",
    startAt: startOfMonth(today),
    endAt: endOfMonth(addMonths(today, 1)),
    status: exampleStatuses[0],
    group: { id: "1", name: "Core AI Features" },
    product: { id: "1", name: "Video Editor Pro" },
    owner: {
      id: "7",
      image: "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=7",
      name: "George Lucas",
    },
    initiative: { id: "1", name: "AI Integration" },
    release: { id: "3", name: "v1.2" },
  },
  {
    id: "8",
    name: "Version Control System",
    startAt: startOfMonth(addMonths(today, 1)),
    endAt: endOfMonth(addMonths(today, 2)),
    status: exampleStatuses[1],
    group: { id: "2", name: "Collaboration Tools" },
    product: { id: "1", name: "Video Editor Pro" },
    owner: {
      id: "8",
      image: "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=8",
      name: "Hannah Montana",
    },
    initiative: { id: "2", name: "Real-time Collaboration" },
    release: { id: "3", name: "v1.2" },
  },
  {
    id: "9",
    name: "AI Content-Aware Fill",
    startAt: startOfMonth(addMonths(today, 2)),
    endAt: endOfMonth(addMonths(today, 3)),
    status: exampleStatuses[2],
    group: { id: "1", name: "Core AI Features" },
    product: { id: "1", name: "Video Editor Pro" },
    owner: {
      id: "9",
      image: "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=9",
      name: "Ian Malcolm",
    },
    initiative: { id: "1", name: "AI Integration" },
    release: { id: "4", name: "v1.3" },
  },
  {
    id: "10",
    name: "Multi-User Permissions",
    startAt: startOfMonth(addMonths(today, 3)),
    endAt: endOfMonth(addMonths(today, 4)),
    status: exampleStatuses[0],
    group: { id: "2", name: "Collaboration Tools" },
    product: { id: "1", name: "Video Editor Pro" },
    owner: {
      id: "10",
      image: "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=10",
      name: "Julia Roberts",
    },
    initiative: { id: "2", name: "Real-time Collaboration" },
    release: { id: "4", name: "v1.3" },
  },
  {
    id: "11",
    name: "AI-Powered Audio Enhancement",
    startAt: startOfMonth(addMonths(today, 4)),
    endAt: endOfMonth(addMonths(today, 5)),
    status: exampleStatuses[1],
    group: { id: "1", name: "Core AI Features" },
    product: { id: "1", name: "Video Editor Pro" },
    owner: {
      id: "11",
      image: "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=11",
      name: "Kevin Hart",
    },
    initiative: { id: "1", name: "AI Integration" },
    release: { id: "4", name: "v1.3" },
  },
  {
    id: "12",
    name: "Real-time Project Analytics",
    startAt: startOfMonth(addMonths(today, 5)),
    endAt: endOfMonth(addMonths(today, 6)),
    status: exampleStatuses[2],
    group: { id: "3", name: "Cloud Infrastructure" },
    product: { id: "1", name: "Video Editor Pro" },
    owner: {
      id: "12",
      image: "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=12",
      name: "Lara Croft",
    },
    initiative: { id: "3", name: "Cloud Migration" },
    release: { id: "5", name: "v1.4" },
  },
  {
    id: "13",
    name: "AI Scene Recommendations",
    startAt: startOfMonth(addMonths(today, 6)),
    endAt: endOfMonth(addMonths(today, 7)),
    status: exampleStatuses[0],
    group: { id: "1", name: "Core AI Features" },
    product: { id: "1", name: "Video Editor Pro" },
    owner: {
      id: "13",
      image: "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=13",
      name: "Michael Scott",
    },
    initiative: { id: "1", name: "AI Integration" },
    release: { id: "5", name: "v1.4" },
  },
  {
    id: "14",
    name: "Collaborative Storyboarding",
    startAt: startOfMonth(addMonths(today, 7)),
    endAt: endOfMonth(addMonths(today, 8)),
    status: exampleStatuses[1],
    group: { id: "2", name: "Collaboration Tools" },
    product: { id: "1", name: "Video Editor Pro" },
    owner: {
      id: "14",
      image: "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=14",
      name: "Natalie Portman",
    },
    initiative: { id: "2", name: "Real-time Collaboration" },
    release: { id: "5", name: "v1.4" },
  },
  {
    id: "15",
    name: "AI-Driven Video Compression",
    startAt: startOfMonth(addMonths(today, 8)),
    endAt: endOfMonth(addMonths(today, 9)),
    status: exampleStatuses[2],
    group: { id: "1", name: "Core AI Features" },
    product: { id: "1", name: "Video Editor Pro" },
    owner: {
      id: "15",
      image: "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=15",
      name: "Oscar Isaac",
    },
    initiative: { id: "1", name: "AI Integration" },
    release: { id: "6", name: "v1.5" },
  },
  {
    id: "16",
    name: "Global CDN Integration",
    startAt: startOfMonth(addMonths(today, 9)),
    endAt: endOfMonth(addMonths(today, 10)),
    status: exampleStatuses[0],
    group: { id: "3", name: "Cloud Infrastructure" },
    product: { id: "1", name: "Video Editor Pro" },
    owner: {
      id: "16",
      image: "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=16",
      name: "Penelope Cruz",
    },
    initiative: { id: "3", name: "Cloud Migration" },
    release: { id: "6", name: "v1.5" },
  },
  {
    id: "17",
    name: "AI Object Tracking",
    startAt: startOfMonth(addMonths(today, 10)),
    endAt: endOfMonth(addMonths(today, 11)),
    status: exampleStatuses[1],
    group: { id: "1", name: "Core AI Features" },
    product: { id: "1", name: "Video Editor Pro" },
    owner: {
      id: "17",
      image: "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=17",
      name: "Quentin Tarantino",
    },
    initiative: { id: "1", name: "AI Integration" },
    release: { id: "6", name: "v1.5" },
  },
  {
    id: "18",
    name: "Real-time Language Translation",
    startAt: startOfMonth(addMonths(today, 11)),
    endAt: endOfMonth(addMonths(today, 12)),
    status: exampleStatuses[2],
    group: { id: "2", name: "Collaboration Tools" },
    product: { id: "1", name: "Video Editor Pro" },
    owner: {
      id: "18",
      image: "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=18",
      name: "Rachel Green",
    },
    initiative: { id: "2", name: "Real-time Collaboration" },
    release: { id: "7", name: "v1.6" },
  },
  {
    id: "19",
    name: "AI-Powered Video Summarization",
    startAt: startOfMonth(addMonths(today, 12)),
    endAt: endOfMonth(addMonths(today, 13)),
    status: exampleStatuses[0],
    group: { id: "1", name: "Core AI Features" },
    product: { id: "1", name: "Video Editor Pro" },
    owner: {
      id: "19",
      image: "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=19",
      name: "Samuel L. Jackson",
    },
    initiative: { id: "1", name: "AI Integration" },
    release: { id: "7", name: "v1.6" },
  },
  {
    id: "20",
    name: "Blockchain-based Asset Licensing",
    startAt: startOfMonth(addMonths(today, 13)),
    endAt: endOfMonth(addMonths(today, 14)),
    status: exampleStatuses[1],
    group: { id: "3", name: "Cloud Infrastructure" },
    product: { id: "1", name: "Video Editor Pro" },
    owner: {
      id: "20",
      image: "https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=20",
      name: "Tom Hanks",
    },
    initiative: { id: "3", name: "Cloud Migration" },
    release: { id: "7", name: "v1.6" },
  },
];

const KanbanExample: FC = () => {
  const [features, setFeatures] = useState(exampleFeatures);
 
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
 
    if (!over) {
      return;
    }
 
    const status = exampleStatuses.find((status) => status.name === over.id);
 
    if (!status) {
      return;
    }
 
    setFeatures(
      features.map((feature) => {
        if (feature.id === active.id) {
          return { ...feature, status };
        }
 
        return feature;
      })
    );
  };
 
  return (
    <KanbanProvider onDragEnd={handleDragEnd}>
      {exampleStatuses.map((status) => (
        <KanbanBoard key={status.name} id={status.name}>
          <KanbanHeader name={status.name} color={status.color} />
          <KanbanCards>
            {features
              .filter((feature) => feature.status.name === status.name)
              .map((feature, index) => (
                <KanbanCard
                  key={feature.id}
                  id={feature.id}
                  name={feature.name}
                  parent={status.name}
                  index={index}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <p className="m-0 flex-1 font-medium text-sm">
                        {feature.name}
                      </p>
                      <p className="m-0 text-xs text-muted-foreground">
                        {feature.initiative.name}
                      </p>
                    </div>
                    {feature.owner && (
                      <Avatar className="h-4 w-4 shrink-0">
                        <AvatarImage src={feature.owner.image} />
                        <AvatarFallback>
                          {feature.owner.name?.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  <p className="m-0text-xs text-muted-foreground">
                    {format(feature.startAt, 'MMM d')} -{' '}
                    {format(feature.endAt, 'MMM d, yyyy')}
                  </p>
                </KanbanCard>
              ))}
          </KanbanCards>
        </KanbanBoard>
      ))}
    </KanbanProvider>
  );
};

export { KanbanExample };
```

Copy-paste these files for dependencies:
```tsx
shadcn/card
import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className,
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

```
```tsx
shadcn/avatar
"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className,
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className,
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }

```

Install NPM dependencies:
```bash
@dnd-kit/core, @radix-ui/react-avatar
```

Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them


칸반이랑 투두 둘다 있어야하며 쫄깃하게 넘어가야함

# 달력
You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure  
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
```tsx
glass-calendar.tsx
import * as React from "react";
import { Settings, Plus, Edit2, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, isSameDay, isToday, getDate, getDaysInMonth, startOfMonth } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils"; // Assuming you have a `cn` utility from shadcn

// --- TYPE DEFINITIONS ---
interface Day {
  date: Date;
  isToday: boolean;
  isSelected: boolean;
}

interface GlassCalendarProps extends React.HTMLAttributes<HTMLDivElement> {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  className?: string;
}

// --- HELPER TO HIDE SCROLLBAR ---
const ScrollbarHide = () => (
  <style>{`
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `}</style>
);


// --- MAIN COMPONENT ---
export const GlassCalendar = React.forwardRef<HTMLDivElement, GlassCalendarProps>(
  ({ className, selectedDate: propSelectedDate, onDateSelect, ...props }, ref) => {
    const [currentMonth, setCurrentMonth] = React.useState(propSelectedDate || new Date());
    const [selectedDate, setSelectedDate] = React.useState(propSelectedDate || new Date());

    // Generate all days for the current month
    const monthDays = React.useMemo(() => {
        const start = startOfMonth(currentMonth);
        const totalDays = getDaysInMonth(currentMonth);
        const days: Day[] = [];
        for (let i = 0; i < totalDays; i++) {
            const date = new Date(start.getFullYear(), start.getMonth(), i + 1);
            days.push({
                date,
                isToday: isToday(date),
                isSelected: isSameDay(date, selectedDate),
            });
        }
        return days;
    }, [currentMonth, selectedDate]);

    const handleDateClick = (date: Date) => {
      setSelectedDate(date);
      onDateSelect?.(date);
    };
    
    const handlePrevMonth = () => {
        setCurrentMonth(subMonths(currentMonth, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(addMonths(currentMonth, 1));
    };

    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-w-[360px] rounded-3xl p-5 shadow-2xl overflow-hidden",
          "bg-black/20 backdrop-blur-xl border border-white/10",
          "text-white font-sans",
          className
        )}
        {...props}
      >
        <ScrollbarHide />
        {/* Header: Tabs and Settings */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 rounded-lg bg-black/20 p-1">
            <button className="rounded-md bg-white px-4 py-1 text-xs font-bold text-black shadow-md">
              Weekly
            </button>
            <button className="rounded-md px-4 py-1 text-xs font-semibold text-white/60 transition-colors hover:text-white">
              Monthly
            </button>
          </div>
          <button className="p-2 text-white/70 transition-colors hover:bg-black/20 rounded-full">
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Date Display and Navigation */}
        <div className="my-6 flex items-center justify-between">
            <motion.p 
              key={format(currentMonth, "MMMM")}
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.3 }}
              className="text-4xl font-bold tracking-tight"
            >
                {format(currentMonth, "MMMM")}
            </motion.p>
            <div className="flex items-center space-x-2">
                <button onClick={handlePrevMonth} className="p-1 rounded-full text-white/70 transition-colors hover:bg-black/20">
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={handleNextMonth} className="p-1 rounded-full text-white/70 transition-colors hover:bg-black/20">
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>
        </div>

        {/* Scrollable Monthly Calendar Grid */}
        <div className="overflow-x-auto scrollbar-hide -mx-5 px-5">
            <div className="flex space-x-4">
                {monthDays.map((day) => (
                    <div key={format(day.date, "yyyy-MM-dd")} className="flex flex-col items-center space-y-2 flex-shrink-0">
                        <span className="text-xs font-bold text-white/50">
                            {format(day.date, "E").charAt(0)}
                        </span>
                        <button
                            onClick={() => handleDateClick(day.date)}
                            className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 relative",
                                {
                                    "bg-gradient-to-br from-pink-500 to-orange-400 text-white shadow-lg": day.isSelected,
                                    "hover:bg-white/20": !day.isSelected,
                                    "text-white": !day.isSelected,
                                }
                            )}
                        >
                            {day.isToday && !day.isSelected && (
                                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-pink-400"></span>
                            )}
                            {getDate(day.date)}
                        </button>
                    </div>
                ))}
            </div>
        </div>
        
        {/* Divider */}
        <div className="mt-6 h-px bg-white/20" />

        {/* Footer Actions */}
        <div className="mt-4 flex items-center justify-between space-x-4">
           <button className="flex items-center space-x-2 text-sm font-medium text-white/70 transition-colors hover:text-white">
             <Edit2 className="h-4 w-4" />
             <span>Add a note...</span>
           </button>
           <button className="flex items-center space-x-2 rounded-lg bg-black/20 px-3 py-2 text-xs font-bold text-white shadow-md transition-colors hover:bg-black/30">
             <Plus className="h-4 w-4" />
             <span>New Event</span>
           </button>
        </div>
      </div>
    );
  }
);

GlassCalendar.displayName = "GlassCalendar";


demo.tsx
import * as React from "react";
import { GlassCalendar } from "@/components/ui/glass-calendar"; // Adjust the import path as needed

export default function GlassCalendarDemo() {
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  
  // A high-quality, abstract background image for the glass effect
  const backgroundImageUrl = "https://plus.unsplash.com/premium_photo-1673873438024-81d29f555b95?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NjM2fHxjb2xvcnxlbnwwfHwwfHx8MA%3D%3D";

  return (
    <div 
      className="flex min-h-screen w-full items-center justify-center bg-cover bg-center p-4 bg-slate-900"
      style={{ backgroundImage: `url(${backgroundImageUrl})` }}
    >
      <GlassCalendar 
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        className="transform transition-transform duration-500 hover:scale-105"
      />
    </div>
  );
}

```

Install NPM dependencies:
```bash
date-fns, lucide-react, framer-motion
```

Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them

You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure  
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
```tsx
glass-calendar.tsx
import * as React from "react";
import { Settings, Plus, Edit2, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, isSameDay, isToday, getDate, getDaysInMonth, startOfMonth } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils"; // Assuming you have a `cn` utility from shadcn

// --- TYPE DEFINITIONS ---
interface Day {
  date: Date;
  isToday: boolean;
  isSelected: boolean;
}

interface GlassCalendarProps extends React.HTMLAttributes<HTMLDivElement> {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  className?: string;
}

// --- HELPER TO HIDE SCROLLBAR ---
const ScrollbarHide = () => (
  <style>{`
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `}</style>
);


// --- MAIN COMPONENT ---
export const GlassCalendar = React.forwardRef<HTMLDivElement, GlassCalendarProps>(
  ({ className, selectedDate: propSelectedDate, onDateSelect, ...props }, ref) => {
    const [currentMonth, setCurrentMonth] = React.useState(propSelectedDate || new Date());
    const [selectedDate, setSelectedDate] = React.useState(propSelectedDate || new Date());

    // Generate all days for the current month
    const monthDays = React.useMemo(() => {
        const start = startOfMonth(currentMonth);
        const totalDays = getDaysInMonth(currentMonth);
        const days: Day[] = [];
        for (let i = 0; i < totalDays; i++) {
            const date = new Date(start.getFullYear(), start.getMonth(), i + 1);
            days.push({
                date,
                isToday: isToday(date),
                isSelected: isSameDay(date, selectedDate),
            });
        }
        return days;
    }, [currentMonth, selectedDate]);

    const handleDateClick = (date: Date) => {
      setSelectedDate(date);
      onDateSelect?.(date);
    };
    
    const handlePrevMonth = () => {
        setCurrentMonth(subMonths(currentMonth, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(addMonths(currentMonth, 1));
    };

    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-w-[360px] rounded-3xl p-5 shadow-2xl overflow-hidden",
          "bg-black/20 backdrop-blur-xl border border-white/10",
          "text-white font-sans",
          className
        )}
        {...props}
      >
        <ScrollbarHide />
        {/* Header: Tabs and Settings */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 rounded-lg bg-black/20 p-1">
            <button className="rounded-md bg-white px-4 py-1 text-xs font-bold text-black shadow-md">
              Weekly
            </button>
            <button className="rounded-md px-4 py-1 text-xs font-semibold text-white/60 transition-colors hover:text-white">
              Monthly
            </button>
          </div>
          <button className="p-2 text-white/70 transition-colors hover:bg-black/20 rounded-full">
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Date Display and Navigation */}
        <div className="my-6 flex items-center justify-between">
            <motion.p 
              key={format(currentMonth, "MMMM")}
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.3 }}
              className="text-4xl font-bold tracking-tight"
            >
                {format(currentMonth, "MMMM")}
            </motion.p>
            <div className="flex items-center space-x-2">
                <button onClick={handlePrevMonth} className="p-1 rounded-full text-white/70 transition-colors hover:bg-black/20">
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <button onClick={handleNextMonth} className="p-1 rounded-full text-white/70 transition-colors hover:bg-black/20">
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>
        </div>

        {/* Scrollable Monthly Calendar Grid */}
        <div className="overflow-x-auto scrollbar-hide -mx-5 px-5">
            <div className="flex space-x-4">
                {monthDays.map((day) => (
                    <div key={format(day.date, "yyyy-MM-dd")} className="flex flex-col items-center space-y-2 flex-shrink-0">
                        <span className="text-xs font-bold text-white/50">
                            {format(day.date, "E").charAt(0)}
                        </span>
                        <button
                            onClick={() => handleDateClick(day.date)}
                            className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 relative",
                                {
                                    "bg-gradient-to-br from-pink-500 to-orange-400 text-white shadow-lg": day.isSelected,
                                    "hover:bg-white/20": !day.isSelected,
                                    "text-white": !day.isSelected,
                                }
                            )}
                        >
                            {day.isToday && !day.isSelected && (
                                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-pink-400"></span>
                            )}
                            {getDate(day.date)}
                        </button>
                    </div>
                ))}
            </div>
        </div>
        
        {/* Divider */}
        <div className="mt-6 h-px bg-white/20" />

        {/* Footer Actions */}
        <div className="mt-4 flex items-center justify-between space-x-4">
           <button className="flex items-center space-x-2 text-sm font-medium text-white/70 transition-colors hover:text-white">
             <Edit2 className="h-4 w-4" />
             <span>Add a note...</span>
           </button>
           <button className="flex items-center space-x-2 rounded-lg bg-black/20 px-3 py-2 text-xs font-bold text-white shadow-md transition-colors hover:bg-black/30">
             <Plus className="h-4 w-4" />
             <span>New Event</span>
           </button>
        </div>
      </div>
    );
  }
);

GlassCalendar.displayName = "GlassCalendar";


demo.tsx
import * as React from "react";
import { GlassCalendar } from "@/components/ui/glass-calendar"; // Adjust the import path as needed

export default function GlassCalendarDemo() {
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  
  // A high-quality, abstract background image for the glass effect
  const backgroundImageUrl = "https://plus.unsplash.com/premium_photo-1673873438024-81d29f555b95?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NjM2fHxjb2xvcnxlbnwwfHwwfHx8MA%3D%3D";

  return (
    <div 
      className="flex min-h-screen w-full items-center justify-center bg-cover bg-center p-4 bg-slate-900"
      style={{ backgroundImage: `url(${backgroundImageUrl})` }}
    >
      <GlassCalendar 
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        className="transform transition-transform duration-500 hover:scale-105"
      />
    </div>
  );
}

```

Install NPM dependencies:
```bash
date-fns, lucide-react, framer-motion
```

Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them

구글 캘린더랑 무조건 연결해야함



