import { Mail } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-card/30 backdrop-blur-sm border-t border-border/50 py-8 px-4 mt-12">
      <div className="max-w-7xl mx-auto">
        <div className="text-center space-y-4">
          <div className="text-sm text-foreground font-medium">
            KomikRu ©2025 All rights reserved
          </div>
          
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <a
              href="mailto:admin@komikru.com"
              className="flex items-center gap-2 hover:text-primary transition-smooth"
            >
              <Mail className="h-4 w-4" />
              <span>admin@komikru.com</span>
            </a>
            
            <a
              href="https://t.me/komikru_admin"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:text-primary transition-smooth"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.85 5.18-4.68c.223-.198-.054-.308-.346-.11l-6.4 4.03-2.76-.918c-.6-.187-.612-.6.125-.89l10.782-4.156c.5-.18.943.11.78.89z"/>
              </svg>
              <span>Telegram</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
