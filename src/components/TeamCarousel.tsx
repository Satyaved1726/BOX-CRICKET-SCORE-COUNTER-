import React, { useState, useRef, useEffect } from 'react';

interface TeamSlideData {
  name: string;
  sub: string;
  bgGradient?: string;
}

interface Props {
  teamA: TeamSlideData;
  teamB: TeamSlideData;
}

export const TeamCarousel: React.FC<Props> = ({ teamA, teamB }) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const getInitials = (name: string) => {
    if (!name) return 'TM';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleScroll = () => {
    if (carouselRef.current) {
      const width = carouselRef.current.clientWidth;
      if (width > 0) {
        const idx = Math.round(carouselRef.current.scrollLeft / width);
        setActiveIndex(idx);
      }
    }
  };

  useEffect(() => {
    const el = carouselRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <div className="w-full select-none">
      <div ref={carouselRef} className="team-carousel">
        {/* Slide 1: Team A */}
        <div className="team-slide">
          <div
            className="team-crest"
            style={{
              background: teamA.bgGradient || 'linear-gradient(135deg, #2962FF, #00C6FF)',
            }}
          >
            {getInitials(teamA.name)}
          </div>
          <div className="team-slide-name">{teamA.name}</div>
          <div className="team-slide-sub">{teamA.sub}</div>
        </div>

        {/* Slide 2: Team B */}
        <div className="team-slide">
          <div
            className="team-crest"
            style={{
              background: teamB.bgGradient || 'linear-gradient(135deg, #9333EA, #C084FC)',
            }}
          >
            {getInitials(teamB.name)}
          </div>
          <div className="team-slide-name">{teamB.name}</div>
          <div className="team-slide-sub">{teamB.sub}</div>
        </div>
      </div>

      {/* Dots Indicator */}
      <div className="carousel-dots">
        <div className={`carousel-dot ${activeIndex === 0 ? 'active' : ''}`} />
        <div className={`carousel-dot ${activeIndex === 1 ? 'active' : ''}`} />
      </div>
    </div>
  );
};
