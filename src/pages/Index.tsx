import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';

interface MinecraftServer {
  id: number;
  server_name: string;
  version: string;
  port: number;
  max_players: number;
  gamemode: string;
  difficulty: string;
  status: string;
  created_at: string;
}

const ACCESS_CODE = '5152';
const API_SERVERS = 'https://functions.poehali.dev/c4277baf-518b-4c84-9db7-2b536a2e0f2c';
const API_FILES = 'https://functions.poehali.dev/9280977d-537c-4bee-a216-c14b02e7dfc7';
const API_DATABASES = 'https://functions.poehali.dev/82883163-8e70-4293-bdc4-0c327f88e75d';

export default function Index() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [servers, setServers] = useState<MinecraftServer[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const [newServer, setNewServer] = useState({
    server_name: '',
    version: '1.20.0',
    port: 19132,
    max_players: 20,
    gamemode: 'survival',
    difficulty: 'normal'
  });

  useEffect(() => {
    const authStatus = sessionStorage.getItem('mcpanel_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      loadServers();
    }
  }, []);

  const loadServers = async () => {
    try {
      const response = await fetch(API_SERVERS);
      const data = await response.json();
      setServers(data.servers || []);
    } catch (error) {
      console.error('Error loading servers:', error);
      toast.error('Ошибка загрузки серверов');
    }
  };

  const handleLogin = () => {
    if (accessCode === ACCESS_CODE) {
      setIsAuthenticated(true);
      sessionStorage.setItem('mcpanel_auth', 'true');
      toast.success('Доступ разрешён');
      loadServers();
    } else {
      toast.error('Неверный код доступа');
    }
  };

  const handleCreateServer = async () => {
    if (!newServer.server_name) {
      toast.error('Укажите название сервера');
      return;
    }

    try {
      const response = await fetch(API_SERVERS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newServer)
      });

      if (response.ok) {
        const createdServer = await response.json();
        setServers([...servers, createdServer]);
        setIsCreateDialogOpen(false);
        toast.success(`Сервер "${newServer.server_name}" создан`);
        
        setNewServer({
          server_name: '',
          version: '1.20.0',
          port: 19132,
          max_players: 20,
          gamemode: 'survival',
          difficulty: 'normal'
        });
      } else {
        toast.error('Ошибка создания сервера');
      }
    } catch (error) {
      console.error('Error creating server:', error);
      toast.error('Ошибка создания сервера');
    }
  };

  const toggleServerStatus = async (id: number) => {
    const server = servers.find(s => s.id === id);
    if (!server) return;

    const newStatus = server.status === 'running' ? 'stopped' : 'running';

    try {
      const response = await fetch(API_SERVERS, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus })
      });

      if (response.ok) {
        setServers(servers.map(s => 
          s.id === id ? { ...s, status: newStatus } : s
        ));
        toast.success(`Сервер ${newStatus === 'running' ? 'запущен' : 'остановлен'}`);
      } else {
        toast.error('Ошибка изменения статуса');
      }
    } catch (error) {
      console.error('Error toggling server:', error);
      toast.error('Ошибка изменения статуса');
    }
  };

  const deleteServer = async (id: number) => {
    const serverName = servers.find(s => s.id === id)?.server_name;

    try {
      const response = await fetch(`${API_SERVERS}?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setServers(servers.filter(server => server.id !== id));
        toast.success(`Сервер "${serverName}" удалён`);
      } else {
        toast.error('Ошибка удаления сервера');
      }
    } catch (error) {
      console.error('Error deleting server:', error);
      toast.error('Ошибка удаления сервера');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="Server" size={32} className="text-primary" />
              <CardTitle className="text-2xl font-bold">Minecraft Panel</CardTitle>
            </div>
            <CardDescription>Введите код доступа для входа в панель управления</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="access-code">Код доступа</Label>
                <Input
                  id="access-code"
                  type="password"
                  placeholder="••••"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <Button onClick={handleLogin} className="w-full">
                <Icon name="Lock" size={16} className="mr-2" />
                Войти
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="Server" size={28} className="text-primary" />
            <h1 className="text-2xl font-bold">Minecraft Panel</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsAuthenticated(false);
              sessionStorage.removeItem('mcpanel_auth');
            }}
          >
            <Icon name="LogOut" size={16} className="mr-2" />
            Выйти
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" className="gap-2">
              <Icon name="LayoutDashboard" size={16} />
              <span className="hidden sm:inline">Дашборд</span>
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-2">
              <Icon name="PlusCircle" size={16} />
              <span className="hidden sm:inline">Создать</span>
            </TabsTrigger>
            <TabsTrigger value="servers" className="gap-2">
              <Icon name="Server" size={16} />
              <span className="hidden sm:inline">Серверы</span>
            </TabsTrigger>
            <TabsTrigger value="ftp" className="gap-2">
              <Icon name="FolderOpen" size={16} />
              <span className="hidden sm:inline">FTP</span>
            </TabsTrigger>
            <TabsTrigger value="database" className="gap-2">
              <Icon name="Database" size={16} />
              <span className="hidden sm:inline">База данных</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Icon name="Settings" size={16} />
              <span className="hidden sm:inline">Настройки</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Всего серверов</CardTitle>
                  <Icon name="Server" size={16} className="text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{servers.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">активных и остановленных</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Активные</CardTitle>
                  <Icon name="Activity" size={16} className="text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    {servers.filter(s => s.status === 'running').length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">сервер(-а/-ов) запущено</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Игроков онлайн</CardTitle>
                  <Icon name="Users" size={16} className="text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground mt-1">на всех серверах</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Использование RAM</CardTitle>
                  <Icon name="Cpu" size={16} className="text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">2.4 GB</div>
                  <p className="text-xs text-muted-foreground mt-1">из 8 GB доступно</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Активные серверы</CardTitle>
                <CardDescription>Список запущенных серверов Minecraft</CardDescription>
              </CardHeader>
              <CardContent>
                {servers.filter(s => s.status === 'running').length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Icon name="ServerOff" size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Нет активных серверов</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {servers.filter(s => s.status === 'running').map(server => (
                      <div key={server.id} className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/50">
                        <div>
                          <div className="font-semibold">{server.server_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {server.version} • Порт {server.port} • {server.max_players} игроков
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="default" className="bg-green-500">Running</Badge>
                          <Button size="sm" variant="outline" onClick={() => toggleServerStatus(server.id)}>
                            <Icon name="Square" size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Создать новый сервер</CardTitle>
                <CardDescription>Настройте параметры сервера Minecraft PE с ядром PocketMine</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="server-name">Название сервера</Label>
                    <Input
                      id="server-name"
                      placeholder="Мой сервер"
                      value={newServer.server_name}
                      onChange={(e) => setNewServer({ ...newServer, server_name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="version">Версия Minecraft PE</Label>
                    <Select value={newServer.version} onValueChange={(value) => setNewServer({ ...newServer, version: value })}>
                      <SelectTrigger id="version">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1.20.0">1.20.0 (Latest)</SelectItem>
                        <SelectItem value="1.19.83">1.19.83</SelectItem>
                        <SelectItem value="1.19.80">1.19.80</SelectItem>
                        <SelectItem value="1.19.70">1.19.70</SelectItem>
                        <SelectItem value="1.19.60">1.19.60</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="port">Порт</Label>
                    <Input
                      id="port"
                      type="number"
                      value={newServer.port}
                      onChange={(e) => setNewServer({ ...newServer, port: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max-players">Макс. игроков</Label>
                    <Input
                      id="max-players"
                      type="number"
                      value={newServer.max_players}
                      onChange={(e) => setNewServer({ ...newServer, max_players: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gamemode">Режим игры</Label>
                    <Select value={newServer.gamemode} onValueChange={(value) => setNewServer({ ...newServer, gamemode: value })}>
                      <SelectTrigger id="gamemode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="survival">Выживание</SelectItem>
                        <SelectItem value="creative">Творчество</SelectItem>
                        <SelectItem value="adventure">Приключение</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Сложность</Label>
                    <Select value={newServer.difficulty} onValueChange={(value) => setNewServer({ ...newServer, difficulty: value })}>
                      <SelectTrigger id="difficulty">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="peaceful">Мирный</SelectItem>
                        <SelectItem value="easy">Лёгкий</SelectItem>
                        <SelectItem value="normal">Нормальный</SelectItem>
                        <SelectItem value="hard">Сложный</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleCreateServer} className="w-full">
                  <Icon name="Plus" size={16} className="mr-2" />
                  Создать сервер
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="servers" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Мои серверы</CardTitle>
                <CardDescription>Управление всеми серверами Minecraft</CardDescription>
              </CardHeader>
              <CardContent>
                {servers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Icon name="Server" size={64} className="mx-auto mb-4 opacity-30" />
                    <p className="text-lg mb-2">Нет серверов</p>
                    <p className="text-sm">Создайте первый сервер во вкладке "Создать"</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Название</TableHead>
                        <TableHead>Версия</TableHead>
                        <TableHead>Порт</TableHead>
                        <TableHead>Игроки</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {servers.map(server => (
                        <TableRow key={server.id}>
                          <TableCell className="font-medium">{server.server_name}</TableCell>
                          <TableCell>{server.version}</TableCell>
                          <TableCell>{server.port}</TableCell>
                          <TableCell>0/{server.max_players}</TableCell>
                          <TableCell>
                            <Badge variant={server.status === 'running' ? 'default' : 'secondary'}>
                              {server.status === 'running' ? 'Работает' : 'Остановлен'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleServerStatus(server.id)}
                              >
                                <Icon name={server.status === 'running' ? 'Square' : 'Play'} size={14} />
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    <Icon name="Trash2" size={14} />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Удалить сервер?</DialogTitle>
                                    <DialogDescription>
                                      Это действие нельзя отменить. Сервер "{server.server_name}" и все его данные будут удалены.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="flex gap-2 justify-end">
                                    <Button variant="outline">Отмена</Button>
                                    <Button variant="destructive" onClick={() => deleteServer(server.id)}>
                                      Удалить
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ftp" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>FTP Менеджер</CardTitle>
                <CardDescription>Управление файлами серверов</CardDescription>
              </CardHeader>
              <CardContent>
                {servers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Icon name="FolderOpen" size={64} className="mx-auto mb-4 opacity-30" />
                    <p>Создайте сервер для управления файлами</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите сервер" />
                      </SelectTrigger>
                      <SelectContent>
                        {servers.map(server => (
                          <SelectItem key={server.id} value={server.id.toString()}>
                            {server.server_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="border border-border rounded-lg p-4 bg-muted/30">
                      <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                        <Icon name="Folder" size={16} />
                        <span>/server/</span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Имя файла</TableHead>
                            <TableHead>Размер</TableHead>
                            <TableHead>Дата изменения</TableHead>
                            <TableHead>Действия</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="flex items-center gap-2">
                              <Icon name="Folder" size={16} className="text-primary" />
                              plugins/
                            </TableCell>
                            <TableCell>-</TableCell>
                            <TableCell>{new Date().toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost">
                                <Icon name="FolderOpen" size={14} />
                              </Button>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="flex items-center gap-2">
                              <Icon name="FileText" size={16} className="text-muted-foreground" />
                              server.properties
                            </TableCell>
                            <TableCell>2.4 KB</TableCell>
                            <TableCell>{new Date().toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost">
                                  <Icon name="Download" size={14} />
                                </Button>
                                <Button size="sm" variant="ghost">
                                  <Icon name="Edit" size={14} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="flex items-center gap-2">
                              <Icon name="FileText" size={16} className="text-muted-foreground" />
                              pocketmine.yml
                            </TableCell>
                            <TableCell>1.8 KB</TableCell>
                            <TableCell>{new Date().toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost">
                                  <Icon name="Download" size={14} />
                                </Button>
                                <Button size="sm" variant="ghost">
                                  <Icon name="Edit" size={14} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    <Button className="w-full" variant="outline">
                      <Icon name="Upload" size={16} className="mr-2" />
                      Загрузить файлы
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Управление базами данных</CardTitle>
                <CardDescription>Создание и управление БД для серверов</CardDescription>
              </CardHeader>
              <CardContent>
                {servers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Icon name="Database" size={64} className="mx-auto mb-4 opacity-30" />
                    <p>Создайте сервер для управления БД</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Select>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Выберите сервер" />
                        </SelectTrigger>
                        <SelectContent>
                          {servers.map(server => (
                            <SelectItem key={server.id} value={server.id.toString()}>
                              {server.server_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button>
                        <Icon name="Plus" size={16} className="mr-2" />
                        Создать БД
                      </Button>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Название БД</TableHead>
                          <TableHead>Размер</TableHead>
                          <TableHead>Создана</TableHead>
                          <TableHead>Действия</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">minecraft_main</TableCell>
                          <TableCell>15.2 MB</TableCell>
                          <TableCell>{new Date().toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Icon name="Settings" size={14} />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Icon name="Download" size={14} />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Icon name="Trash2" size={14} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">player_data</TableCell>
                          <TableCell>8.7 MB</TableCell>
                          <TableCell>{new Date().toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Icon name="Settings" size={14} />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Icon name="Download" size={14} />
                              </Button>
                              <Button size="sm" variant="outline">
                                <Icon name="Trash2" size={14} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Настройки панели</CardTitle>
                <CardDescription>Конфигурация и параметры системы</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Автозапуск серверов</div>
                      <div className="text-sm text-muted-foreground">Запускать серверы при старте системы</div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Icon name="ToggleLeft" size={20} />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Автообновление</div>
                      <div className="text-sm text-muted-foreground">Обновлять PocketMine автоматически</div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Icon name="ToggleLeft" size={20} />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Резервное копирование</div>
                      <div className="text-sm text-muted-foreground">Создавать бэкапы каждые 24 часа</div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Icon name="ToggleRight" size={20} className="text-primary" />
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-border space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Версия панели</span>
                    <span className="font-mono">v1.0.0</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">PocketMine версия</span>
                    <span className="font-mono">5.0.0</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  <Icon name="RefreshCw" size={16} className="mr-2" />
                  Проверить обновления
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}