"use client";

import { useState } from "react";

export interface TeacherCardProps {
  name: string;
  title?: string | null;
  bio?: string | null;
  avatar?: string | null;
  linkedIn?: string | null;
  courseCount?: number;
}

export function TeacherCard({
  name,
  title,
  bio,
  avatar,
  linkedIn,
  courseCount = 0,
}: TeacherCardProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = avatar && !imgError;

  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02]"
      style={{ height: "400px" }}
    >
      {/* Rasm — butun kartani to'ldiradi */}
      {showImage ? (
        <img
          src={avatar ?? ""}
          alt={name}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: "cover", objectPosition: "center top" }}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0f2027 100%)" }}
        >
          <span
            style={{
              fontSize: "80px",
              fontWeight: 700,
              color: "rgba(255,255,255,0.3)",
            }}
          >
            {name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Pastki gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0) 70%)",
        }}
      />

      {/* LinkedIn — yuqori o'ng burchak */}
      {linkedIn && (
        <a
          href={linkedIn}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute top-4 right-4 flex items-center justify-center rounded-full transition-transform duration-200 hover:scale-110 z-10"
          style={{
            width: "36px",
            height: "36px",
            backgroundColor: "#0A66C2",
          }}
          aria-label={`${name} LinkedIn`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452z" />
          </svg>
        </a>
      )}

      {/* Matn bloki — rasm ustida pastda */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <h3
          className="font-bold text-white mb-1"
          style={{
            fontSize: "18px",
            lineHeight: "1.3",
            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          }}
        >
          {name}
        </h3>

        {title && (
          <p
            className="font-medium mb-2"
            style={{ fontSize: "13px", color: "#4ade80" }}
          >
            {title}
          </p>
        )}

        {bio && (
          <p
            style={{
              fontSize: "12px",
              color: "rgba(255,255,255,0.75)",
              lineHeight: "1.5",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            }}
          >
            {bio}
          </p>
        )}

        {courseCount > 0 && (
          <div className="mt-3 flex items-center gap-1">
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
              📚 {courseCount} ta kurs
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
