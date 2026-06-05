import React, { useEffect, useRef } from 'react';

export default function FaceMesh3D({ status = 'idle', scanning = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let angleY = 0;
    let angleX = -0.15; // Slightly tilted down
    let scanLineY = 0;
    let scanDirection = 1;

    // Generate 3D face mesh coordinates
    const vertices = [];
    const connections = [];
    const rows = 15;
    const cols = 15;

    for (let r = 0; r < rows; r++) {
      const theta = (r / (rows - 1)) * Math.PI; // 0 to PI
      for (let c = 0; c < cols; c++) {
        const phi = (c / (cols - 1)) * Math.PI - Math.PI / 2; // -PI/2 to PI/2 (front face)
        
        let x = Math.sin(theta) * Math.sin(phi);
        let y = Math.cos(theta);
        let z = Math.sin(theta) * Math.cos(phi);
        
        // Add facial contours:
        // 1. Nose bump (centered, row 7-8, col 7)
        const noseDist = Math.hypot(r - 7.5, c - 7);
        if (noseDist < 3.5) {
          z += (3.5 - noseDist) * 0.16;
        }

        // 2. Eye sockets (row 5, cols 4.5 and 9.5)
        const leftEyeDist = Math.hypot(r - 5, c - 4.5);
        if (leftEyeDist < 2) {
          z -= (2 - leftEyeDist) * 0.08;
        }
        const rightEyeDist = Math.hypot(r - 5, c - 9.5);
        if (rightEyeDist < 2) {
          z -= (2 - rightEyeDist) * 0.08;
        }

        // 3. Mouth cavity (row 10, col 7)
        const mouthDist = Math.hypot(r - 10, c - 7);
        if (mouthDist < 2.5) {
          z -= (2.5 - mouthDist) * 0.04;
          y += (2.5 - mouthDist) * 0.02; // lip indentation
        }

        // Scale factors
        const scaleX = 90;
        const scaleY = 110;
        const scaleZ = 90;

        vertices.push({
          x: x * scaleX,
          y: y * scaleY - 20, // Center vertically
          z: z * scaleZ
        });
      }
    }

    // Connect vertices to create a wireframe grid
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (c < cols - 1) connections.push([idx, idx + 1]); // Horizontal lines
        if (r < rows - 1) connections.push([idx, idx + cols]); // Vertical lines
      }
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener('resize', resize);

    // Color theme based on system authentication status
    const getColors = () => {
      switch (status) {
        case 'success':
          return { primary: '#10b981', secondary: 'rgba(16, 185, 129, 0.2)', glow: 'rgba(16, 185, 129, 0.6)' };
        case 'failed':
          return { primary: '#ef4444', secondary: 'rgba(239, 68, 68, 0.2)', glow: 'rgba(239, 68, 68, 0.6)' };
        case 'scanning':
          return { primary: '#8b5cf6', secondary: 'rgba(139, 92, 246, 0.2)', glow: 'rgba(139, 92, 246, 0.6)' };
        default:
          return { primary: '#06b6d4', secondary: 'rgba(6, 182, 212, 0.2)', glow: 'rgba(6, 182, 212, 0.6)' };
      }
    };

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      // Colors
      const colors = getColors();

      // Draw Hologram Pedestal Base
      const centerY = height - 40;
      const centerX = width / 2;
      const rx = 100;
      const ry = 25;

      // Base rings
      ctx.shadowBlur = 0;
      ctx.strokeStyle = colors.secondary;
      ctx.lineWidth = 1;
      
      // Outer pedestal ring
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Middle ring
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, rx - 15, ry - 4, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Inner glowing ring
      ctx.strokeStyle = colors.primary;
      ctx.shadowColor = colors.primary;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, rx - 35, ry - 9, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Pedestal ticks/segments
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + (scanning ? Date.now() / 4000 : 0);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(centerX + (rx - 5) * cos, centerY + (ry - 1.5) * sin);
        ctx.lineTo(centerX + (rx + 5) * cos, centerY + (ry + 1.5) * sin);
        ctx.stroke();
      }

      // Rotate and Project 3D Vertices
      const radY = angleY;
      const radX = angleX;
      const cosY = Math.cos(radY);
      const sinY = Math.sin(radY);
      const cosX = Math.cos(radX);
      const sinX = Math.sin(radX);

      const projected = [];
      const camDist = 300;

      vertices.forEach(v => {
        // Rotate Y
        let x1 = v.x * cosY - v.z * sinY;
        let z1 = v.z * cosY + v.x * sinY;

        // Rotate X
        let y2 = v.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + v.y * sinX;

        // Perspective Projection
        const zDepth = z2 + camDist;
        const scale = camDist / zDepth;
        const projX = centerX + x1 * scale;
        const projY = centerY - 110 + y2 * scale; // Position above pedestal

        projected.push({ x: projX, y: projY, scale, z: z2 });
      });

      // Draw connecting lines
      ctx.lineWidth = 0.8;
      connections.forEach(([i1, i2]) => {
        const p1 = projected[i1];
        const p2 = projected[i2];

        // Draw only front-facing or semi-visible lines to make it look clean
        if (p1.z > -40 && p2.z > -40) {
          const depthAlpha = Math.max(0.1, (p1.z + p2.z) / 200 + 0.6);
          ctx.strokeStyle = colors.primary;
          ctx.globalAlpha = depthAlpha * (status === 'scanning' ? 0.95 : 0.75);
          ctx.shadowBlur = status === 'scanning' ? 5 : 2;
          ctx.shadowColor = colors.primary;
          
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;

      // Draw light beams rising from base
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = colors.secondary;
      for (let i = 0; i < projected.length; i += 12) {
        const p = projected[i];
        if (p.z > -20 && p.scale > 0.8) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(centerX + (p.x - centerX) * 0.4, centerY);
          ctx.stroke();
        }
      }

      // Draw active scanner lines if scanning
      if (status === 'scanning' || scanning) {
        scanLineY += scanDirection * 2.5;
        if (scanLineY > 160 || scanLineY < -10) {
          scanDirection *= -1;
        }

        ctx.strokeStyle = colors.primary;
        ctx.shadowColor = colors.primary;
        ctx.shadowBlur = 12;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(centerX - 95, centerY - 100 + scanLineY);
        ctx.lineTo(centerX + 95, centerY - 100 + scanLineY);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
      }

      // Rotate model over time
      const rotSpeed = status === 'scanning' ? 0.05 : 0.015;
      angleY += rotSpeed;

      // Idle vertical wave
      if (status !== 'scanning') {
        angleX = -0.15 + Math.sin(Date.now() / 1500) * 0.04;
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [status, scanning]);

  return (
    <div className="relative w-full h-[250px] flex items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
