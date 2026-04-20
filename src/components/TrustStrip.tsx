import { Shield, Globe, Sparkles, Zap } from 'lucide-react';

export function TrustStrip() {
  return (
    <section className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-500" />
          <span>SOC2 Compliant</span>
        </div>
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-500" />
          <span>Global Infrastructure</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span>AI-Powered</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span>Enterprise Performance</span>
        </div>
      </div>
    </section>
  );
}
