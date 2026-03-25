import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { ShieldAlert, Activity, LayoutGrid, Key, Settings2, PlayCircle } from 'lucide-react';

const Admin = () => {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [manualTriggerLoading, setManualTriggerLoading] = useState(false);

  useEffect(() => {
    if (isAuthorized) {
      fetchConfig();
      fetchStatus();
    }
  }, [isAuthorized]);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      toast.error('获取配置失败');
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'zt1998') {
      setIsAuthorized(true);
      toast.success('登录成功');
    } else {
      toast.error('密码错误');
    }
  };

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        toast.success('配置已保存');
      }
    } catch (err) {
      toast.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      const res = await fetch('/api/reset-simulation', { method: 'POST' });
      if (res.ok) {
        toast.success('系统已重置');
        fetchStatus();
      }
    } catch (err) {
      toast.error('重置失败');
    }
  };

  const handleManualTrigger = async () => {
    setManualTriggerLoading(true);
    try {
      const res = await fetch('/api/trigger-decision', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: "管理员手动触发",
          prompt: "立即进行全面市场扫描，根据当前行情和持仓状况作出最优决策。"
        })
      });
      if (res.ok) {
        toast.success('决策点触发成功');
        fetchStatus();
      }
    } catch (err) {
      toast.error('触发失败');
    } finally {
      setManualTriggerLoading(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mx-auto mb-4">
              <ShieldAlert size={24} />
            </div>
            <CardTitle className="text-2xl font-bold">管理后台登录</CardTitle>
            <p className="text-sm text-gray-500 mt-1">请输入管理员密码访问“金豆芽”控制台</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">管理员密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-gray-50"
                />
              </div>
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white">进入系统</Button>
            </form>
          </CardContent>
          <CardFooter className="text-center block">
            <p className="text-[10px] text-gray-300 uppercase tracking-widest">v0.1 Admin Module</p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] p-4 md:p-6 pb-20">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">管理控制台</h1>
            <p className="text-sm text-gray-500 mt-1">金豆芽 v0.1 管理与决策配置</p>
          </div>
          <div className="flex w-full md:w-auto gap-3 md:gap-4">
            <Card className="flex-1 md:flex-none px-3 md:px-4 py-2 border-0 shadow-sm flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-blue-50 text-blue-600 rounded-lg"><Activity size={16} /></div>
              <div>
                <p className="text-[9px] md:text-[10px] text-gray-400 uppercase font-medium">账户资产 (平均)</p>
                <p className="text-xs md:text-sm font-bold">¥ {status?.cash?.toLocaleString() || '---'}</p>
              </div>
            </Card>
            <Card className="flex-1 md:flex-none px-3 md:px-4 py-2 border-0 shadow-sm flex items-center gap-2 md:gap-3">
              <div className="p-1.5 md:p-2 bg-green-50 text-green-600 rounded-lg"><LayoutGrid size={16} /></div>
              <div>
                <p className="text-[9px] md:text-[10px] text-gray-400 uppercase font-medium">活跃持仓</p>
                <p className="text-xs md:text-sm font-bold">{status?.holdings_count || 0} 只</p>
              </div>
            </Card>
          </div>
        </div>

        {config && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Left: Strategy Prompt Edit */}
            <div className="lg:col-span-2 space-y-6 md:space-y-8">
              <Card className="border-0 shadow-sm">
                <CardHeader className="p-4 md:p-6 flex flex-row items-center justify-between">
                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                    <Settings2 size={18} className="text-purple-600" />
                    策略 System Prompt 管理
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0 md:pt-0 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs md:text-sm font-semibold text-gray-700">技术流 系统提示词</Label>
                    <Textarea 
                      rows={6}
                      className="bg-gray-50 text-[11px] md:text-xs font-mono p-3"
                      value={config.technical_flow_prompt}
                      onChange={(e) => setConfig({ ...config, technical_flow_prompt: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs md:text-sm font-semibold text-gray-700">龙头战法 系统提示词</Label>
                    <Textarea 
                      rows={6}
                      className="bg-gray-50 text-[11px] md:text-xs font-mono p-3"
                      value={config.leading_dragon_prompt}
                      onChange={(e) => setConfig({ ...config, leading_dragon_prompt: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* API and Endpoints */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                    <Key size={18} className="text-purple-600" />
                    模型与 API 端点配置
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0 md:pt-0 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-xs md:text-sm font-semibold text-gray-700">Volcengine Ark API Key</Label>
                    <Input 
                      type="password"
                      value={config.ark_api_key}
                      onChange={(e) => setConfig({ ...config, ark_api_key: e.target.value })}
                      className="bg-gray-50 h-9 md:h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs md:text-sm font-semibold text-gray-700">Model A Endpoint (TechFlow)</Label>
                    <Input 
                      value={config.model_a_endpoint}
                      onChange={(e) => setConfig({ ...config, model_a_endpoint: e.target.value })}
                      className="bg-gray-50 h-9 md:h-10 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs md:text-sm font-semibold text-gray-700">Model B Endpoint (TechFlow)</Label>
                    <Input 
                      value={config.model_b_endpoint}
                      onChange={(e) => setConfig({ ...config, model_b_endpoint: e.target.value })}
                      className="bg-gray-50 h-9 md:h-10 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs md:text-sm font-semibold text-gray-700">Model C Endpoint (Dragon)</Label>
                    <Input 
                      value={config.model_c_endpoint}
                      onChange={(e) => setConfig({ ...config, model_c_endpoint: e.target.value })}
                      className="bg-gray-50 h-9 md:h-10 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs md:text-sm font-semibold text-gray-700">Model D Endpoint (Dragon)</Label>
                    <Input 
                      value={config.model_d_endpoint}
                      onChange={(e) => setConfig({ ...config, model_d_endpoint: e.target.value })}
                      className="bg-gray-50 h-9 md:h-10 text-xs"
                    />
                  </div>
                </CardContent>
                <CardFooter className="bg-gray-50 p-4 md:p-6 flex justify-end">
                  <Button 
                    onClick={handleSaveConfig} 
                    disabled={loading}
                    className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white min-w-[120px]"
                  >
                    {loading ? '正在保存...' : '保存配置'}
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Right: Actions */}
            <div className="space-y-8">
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PlayCircle size={18} className="text-green-600" />
                    手动触发决策
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">
                    立即让所有 AI 模型对当前市场进行一次全面分析并执行交易指令。该操作不会影响已设定的定时任务。
                  </p>
                  <Button 
                    onClick={handleManualTrigger} 
                    disabled={manualTriggerLoading}
                    variant="outline"
                    className="w-full border-green-200 text-green-700 hover:bg-green-50"
                  >
                    {manualTriggerLoading ? '决策执行中...' : '立即运行一次决策'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-red-50">
                <CardHeader>
                  <CardTitle className="text-lg text-red-900 flex items-center gap-2">危急操作</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-red-700 leading-relaxed">
                    重置系统将清空所有模拟交易历史、当前持仓和收益曲线，并将账户余额恢复为初始值 (¥ 1,000,000)。
                  </p>
                </CardContent>
                <CardFooter>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">重置系统</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>确认重置系统？</AlertDialogTitle>
                        <AlertDialogDescription>
                          您确定要清空所有数据并将账户恢复至初始状态吗？所有已生成的收益曲线和历史流水将丢失。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReset} className="bg-red-600 hover:bg-red-700 text-white">
                          确认重置
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-gray-900">系统信息</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">系统版本</span>
                    <span className="font-mono font-medium">v0.1-beta</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">运行状态</span>
                    <span className="text-green-500 font-medium">Healthy</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">最后同步时间</span>
                    <span className="font-mono text-[10px]">{new Date().toLocaleTimeString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;
