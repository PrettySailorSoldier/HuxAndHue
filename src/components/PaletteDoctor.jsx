import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Sparkles, TrendingUp } from 'lucide-react';
import { analyzePalette, addNeutralColor, expandLightnessRange, adjustForReadability } from '../utils/paletteAnalyzer';
import { oklchToHex } from '../utils/colorUtils';

export default function PaletteDoctor({ colors, onApplyFix }) {
  const [analysis, setAnalysis] = useState(null);

  useEffect(() => {
    if (colors && colors.length > 0) {
      setAnalysis(analyzePalette(colors));
    }
  }, [colors]);

  if (!analysis || !colors || colors.length === 0) {
    return (
      <div className="text-center text-text-muted py-8">
        <Sparkles size={32} className="mx-auto mb-3 opacity-50" />
        <p className="text-sm">Generate a palette to see analysis</p>
      </div>
    );
  }

  const getScoreColor = (score) => {
    if (score >= 80) return '#4ade80'; // Green
    if (score >= 60) return '#fbbf24'; // Yellow
    return '#f87171'; // Red
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'high') return <AlertCircle size={16} className="text-red-400" />;
    if (severity === 'medium') return <AlertCircle size={16} className="text-yellow-400" />;
    return <AlertCircle size={16} className="text-blue-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Health Score */}
      <div className="bg-bg-elevated rounded-xl p-5 border border-[#1a1a24]">
        <div className="flex items-center gap-4 mb-4">
          <div 
            className="text-5xl font-display font-bold"
            style={{ color: getScoreColor(analysis.healthScore) }}
          >
            {analysis.healthScore}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-text-primary mb-1">
              Palette Health
            </h3>
            <p className="text-xs text-text-secondary">
              {analysis.summary.quality} · {analysis.summary.recommendation}
            </p>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="flex gap-2 h-2 rounded-full overflow-hidden bg-bg-deep">
          <div 
            className="bg-green-500 transition-all"
            style={{ width: `${analysis.healthScore}%` }}
          />
        </div>
      </div>

      {/* Issues & Fixes */}
      {analysis.issues.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs text-text-secondary uppercase tracking-wider font-medium">
            Issues Found ({analysis.issues.length})
          </h4>
          
          {analysis.issues.map((issue, i) => (
            <div 
              key={i}
              className="bg-bg-elevated rounded-lg p-4 border border-[#1a1a24] hover:border-[#252530] transition-colors"
            >
              <div className="flex items-start gap-3">
                {getSeverityIcon(issue.severity)}
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-medium text-text-primary mb-1">
                    {issue.title}
                  </h5>
                  <p className="text-xs text-text-secondary mb-2">
                    {issue.message}
                  </p>
                  <p className="text-xs text-text-muted">
                    💡 {issue.recommendation}
                  </p>
                </div>
                
                {issue.fixable && (
                  <button
                    onClick={() => {
                      // Apply the appropriate fix
                      let fixed;
                      if (issue.type === 'saturation' && issue.message.includes('highly saturated')) {
                        fixed = addNeutralColor(colors);
                      } else if (issue.type === 'contrast') {
                        fixed = expandLightnessRange(colors);
                      } else if (issue.type === 'readability') {
                        fixed = adjustForReadability(colors);
                      }
                      
                      if (fixed) onApplyFix(fixed);
                    }}
                    className="px-3 py-1.5 bg-accent hover:bg-accent/80 rounded-lg text-xs font-medium transition-colors shrink-0"
                  >
                    Fix
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Issues */}
      {analysis.issues.length === 0 && (
        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
          <div className="flex items-center gap-3">
            <CheckCircle size={20} className="text-green-400 shrink-0" />
            <div>
              <h5 className="text-sm font-medium text-green-400 mb-1">
                No Issues Found
              </h5>
              <p className="text-xs text-green-300/70">
                This palette follows design best practices
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Improvements */}
      {analysis.improvements.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs text-text-secondary uppercase tracking-wider font-medium flex items-center gap-2">
            <TrendingUp size={12} />
            Suggested Improvements
          </h4>
          
          {analysis.improvements.slice(0, 3).map((improvement, i) => (
            <div key={i} className="text-xs text-text-muted bg-bg-elevated rounded-lg p-3 border border-[#1a1a24]">
              <span className="text-accent mr-1">•</span>
              {improvement.action}
            </div>
          ))}
        </div>
      )}

      {/* Usage Guidelines */}
      {Object.keys(analysis.usageMap).length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs text-text-secondary uppercase tracking-wider font-medium">
            Recommended Usage
          </h4>
          
          <div className="space-y-2">
            {Object.entries(analysis.usageMap).map(([role, colorIndex]) => (
              <div 
                key={role}
                className="flex items-center gap-3 bg-bg-elevated rounded-lg p-2 border border-[#1a1a24]"
              >
                <div 
                  className="w-8 h-8 rounded-lg shadow shrink-0"
                  style={{ backgroundColor: oklchToHex(colors[colorIndex]) }}
                />
                <div className="flex-1">
                  <p className="text-xs font-medium text-text-primary capitalize">
                    {role.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <p className="text-[10px] text-text-muted font-mono">
                    {oklchToHex(colors[colorIndex])}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual Metrics Summary */}
      <div className="bg-bg-elevated rounded-lg p-4 border border-[#1a1a24] space-y-3">
        <h4 className="text-xs text-text-secondary uppercase tracking-wider font-medium">
          Metrics
        </h4>
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-text-muted mb-1">Saturation Range</p>
            <p className="text-text-primary font-medium">
              {(analysis.visualMetrics.saturationRange.spread * 100).toFixed(0)}%
            </p>
          </div>
          
          <div>
            <p className="text-text-muted mb-1">Lightness Range</p>
            <p className="text-text-primary font-medium">
              {(analysis.visualMetrics.lightnessDistribution.range * 100).toFixed(0)}%
            </p>
          </div>
          
          <div>
            <p className="text-text-muted mb-1">Readability</p>
            <p className="text-text-primary font-medium">
              {analysis.readability.passingPercentage.toFixed(0)}% passing
            </p>
          </div>
          
          <div>
            <p className="text-text-muted mb-1">Temperature</p>
            <p className="text-text-primary font-medium">
              {analysis.visualMetrics.temperatureBalance.isBalanced ? 'Balanced' : 
               analysis.visualMetrics.temperatureBalance.warmPercentage > 50 ? 'Warm' : 'Cool'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
