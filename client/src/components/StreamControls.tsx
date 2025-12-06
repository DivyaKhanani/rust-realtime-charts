import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  Activity,
  Clock,
} from "lucide-react";

export interface StreamControlsProps {
  drift: number;
  volatility: number;
  updateRate: number;
  isRunning: boolean;
  onDriftChange: (value: number) => void;
  onVolatilityChange: (value: number) => void;
  onUpdateRateChange: (value: number) => void;
  onToggleRunning: () => void;
  onReset: () => void;
}

const StreamControls: React.FC<StreamControlsProps> = ({
  drift,
  volatility,
  updateRate,
  isRunning,
  onDriftChange,
  onVolatilityChange,
  onUpdateRateChange,
  onToggleRunning,
  onReset,
}) => {
  return (
    <Card className="mb-6 border border-border/50 bg-card/50 backdrop-blur-sm shadow-lg">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Activity className="h-5 w-5 text-primary" />
            Stream Controls
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={isRunning ? "default" : "secondary"}
              className={`px-3 py-1 ${
                isRunning
                  ? "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
                  : ""
              }`}>
              {isRunning ? "🟢 Live" : "⚫ Paused"}
            </Badge>
            <Button
              onClick={onToggleRunning}
              size="sm"
              variant={isRunning ? "destructive" : "default"}
              className="gap-2 shadow-md">
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start
                </>
              )}
            </Button>
            <Button
              onClick={onReset}
              size="sm"
              variant="outline"
              className="gap-2 border-border/50 hover:bg-accent">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Drift Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Drift
              </Label>
              <Badge variant="outline" className="font-mono bg-background/50">
                {(drift * 100).toFixed(2)}%
              </Badge>
            </div>
            <Slider
              value={[drift]}
              onValueChange={([value]) => onDriftChange(value)}
              min={-0.005}
              max={0.01}
              step={0.0001}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>-0.5%</span>
              <span>+1%</span>
            </div>
          </div>

          {/* Volatility Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Activity className="h-4 w-4 text-orange-500" />
                Volatility
              </Label>
              <Badge variant="outline" className="font-mono bg-background/50">
                {(volatility * 100).toFixed(2)}%
              </Badge>
            </div>
            <Slider
              value={[volatility]}
              onValueChange={([value]) => onVolatilityChange(value)}
              min={0.001}
              max={0.05}
              step={0.001}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.1%</span>
              <span>5%</span>
            </div>
          </div>

          {/* Update Rate Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4 text-green-500" />
                Update Rate
              </Label>
              <Badge variant="outline" className="font-mono bg-background/50">
                {updateRate}ms
              </Badge>
            </div>
            <Slider
              value={[updateRate]}
              onValueChange={([value]) => onUpdateRateChange(value)}
              min={16}
              max={500}
              step={16}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>16ms</span>
              <span>500ms</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StreamControls;
