import Image from 'next/image';
import Link from 'next/link';

interface BrandLogoProps {
  href?: string;
  size?: number;
  showText?: boolean;
  variant?: 'light' | 'dark';
  subtitle?: string;
  className?: string;
}

export function BrandLogo({
  href,
  size = 40,
  showText = true,
  variant = 'dark',
  subtitle = 'Stay. Live. Belong',
  className = '',
}: BrandLogoProps) {
  const content = (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <Image
        src="/images/logo.png"
        alt="E Stays Hotels"
        width={size}
        height={size}
        className="shrink-0"
        style={{ height: size, width: 'auto' }}
      />
      {showText && (
        <div className="hidden sm:block leading-tight">
          <span className={`font-display font-bold ${variant === 'light' ? 'text-white' : 'text-ink'}`}>
            E Stays Hotels
          </span>
          {subtitle && (
            <p className={`text-xs -mt-0.5 ${variant === 'light' ? 'text-white/80' : 'text-ink-muted'}`}>{subtitle}</p>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="hover:opacity-90 transition">
        {content}
      </Link>
    );
  }

  return content;
}
