'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Lock,
  Key,
  Eye,
  Activity,
  Globe,
  Server,
  Database,
  User
} from 'lucide-react';

const securityLogs = [
  { id: 1, type: 'login', user: 'admin@monlyking.com', ip: '192.168.1.1', time: '2 min ago', status: 'success' },
  { id: 2, type: 'failed', user: 'unknown@test.com', ip: '45.23.156.89', time: '15 min ago', status: 'blocked' },
  { id: 3, type: 'login', user: 'support@monlyking.com', ip: '192.168.1.5', time: '1 hour ago', status: 'success' },
  { id: 4, type: 'failed', user: 'admin@monlyking.com', ip: '123.45.67.89', time: '2 hours ago', status: 'blocked' },
  { id: 5, type: 'password_change', user: 'admin@monlyking.com', ip: '192.168.1.1', time: '3 hours ago', status: 'success' },
  { id: 6, type: 'failed', user: 'test@hack.com', ip: '88.99.11.22', time: '5 hours ago', status: 'blocked' },
];

const blockedIPs = [
  { ip: '45.23.156.89', reason: 'Multiple failed login attempts', blocked: '2 hours ago', attempts: 15 },
  { ip: '88.99.11.22', reason: 'Suspicious activity detected', blocked: '5 hours ago', attempts: 8 },
  { ip: '123.45.67.89', reason: 'DDoS attempt', blocked: '1 day ago', attempts: 250 },
];

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Security Center</h1>
          <p className="text-white/60">Monitor and manage platform security</p>
        </div>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Security Score</p>
                <p className="text-2xl font-bold text-green-400">94%</p>
                <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                  <CheckCircle className="h-3 w-3" />
                  Excellent
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Shield className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Blocked Attacks</p>
                <p className="text-2xl font-bold text-white">273</p>
                <p className="text-xs text-white/60 mt-1">Last 24 hours</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Active Sessions</p>
                <p className="text-2xl font-bold text-white">12</p>
                <p className="text-xs text-white/60 mt-1">Currently online</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Activity className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e2236] border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/60 text-sm mb-1">Blocked IPs</p>
                <p className="text-2xl font-bold text-white">{blockedIPs.length}</p>
                <p className="text-xs text-white/60 mt-1">Total banned</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Lock className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Features */}
      <Card className="bg-[#1e2236] border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-400" />
            Security Features
          </CardTitle>
          <CardDescription className="text-white/60">Active security measures</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">SSL Encryption</h3>
                  <Badge className="bg-green-500/20 text-green-400 text-xs">Active</Badge>
                </div>
              </div>
              <p className="text-white/60 text-sm">HTTPS enabled on all pages</p>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Firewall</h3>
                  <Badge className="bg-green-500/20 text-green-400 text-xs">Active</Badge>
                </div>
              </div>
              <p className="text-white/60 text-sm">DDoS protection enabled</p>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">2FA</h3>
                  <Badge className="bg-green-500/20 text-green-400 text-xs">Active</Badge>
                </div>
              </div>
              <p className="text-white/60 text-sm">Two-factor authentication</p>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Rate Limiting</h3>
                  <Badge className="bg-green-500/20 text-green-400 text-xs">Active</Badge>
                </div>
              </div>
              <p className="text-white/60 text-sm">API request throttling</p>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Auto Backup</h3>
                  <Badge className="bg-green-500/20 text-green-400 text-xs">Active</Badge>
                </div>
              </div>
              <p className="text-white/60 text-sm">Daily database backups</p>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Malware Scan</h3>
                  <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Scheduled</Badge>
                </div>
              </div>
              <p className="text-white/60 text-sm">Next scan in 2 hours</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Logs */}
        <Card className="bg-[#1e2236] border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Recent Security Logs
            </CardTitle>
            <CardDescription className="text-white/60">Latest security events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {securityLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {log.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                      )}
                      <span className="text-white text-sm font-medium">
                        {log.type === 'login' ? 'Successful Login' : 
                         log.type === 'failed' ? 'Failed Login' : 'Password Change'}
                      </span>
                    </div>
                    <span className="text-white/40 text-xs">{log.time}</span>
                  </div>
                  <div className="ml-6 space-y-1">
                    <p className="text-white/60 text-xs">User: {log.user}</p>
                    <p className="text-white/60 text-xs">IP: {log.ip}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Blocked IPs */}
        <Card className="bg-[#1e2236] border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-red-400" />
              Blocked IP Addresses
            </CardTitle>
            <CardDescription className="text-white/60">Banned IP addresses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {blockedIPs.map((blocked) => (
                <div key={blocked.ip} className="p-3 rounded-lg bg-white/5 border border-red-500/20">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-red-400 flex-shrink-0" />
                      <span className="text-white text-sm font-mono">{blocked.ip}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 text-xs">
                      Unblock
                    </Button>
                  </div>
                  <div className="ml-6 space-y-1">
                    <p className="text-white/60 text-xs">{blocked.reason}</p>
                    <div className="flex items-center gap-3 text-white/40 text-xs">
                      <span>Blocked: {blocked.blocked}</span>
                      <span>•</span>
                      <span>Attempts: {blocked.attempts}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
