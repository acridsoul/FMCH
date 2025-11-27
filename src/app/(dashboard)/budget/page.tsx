'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { createClient } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  DollarSign,
  Plus,
  Search,
  Loader2,
  Package,
  Users,
  MapPin,
  Film,
  MoreHorizontal,
  Receipt,
  Eye,
} from 'lucide-react';
import type { ExpenseWithProject, Project, ExpenseCategory } from '@/types/database';
import { getUserExpenses, createExpense } from '@/lib/expenses';
import AIInsightsWidget from '@/components/ai/AIInsightsWidget';

const CATEGORY_ICONS: Record<ExpenseCategory, React.ReactNode> = {
  equipment: <Package className="h-4 w-4" />,
  crew: <Users className="h-4 w-4" />,
  location: <MapPin className="h-4 w-4" />,
  'post-production': <Film className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
};

const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  equipment: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  crew: 'bg-green-500/10 text-green-700 dark:text-green-400',
  location: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
  'post-production': 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  other: 'bg-gray-500/10 text-gray-700 dark:text-gray-400',
};

export default function BudgetPage() {
  const permissions = usePermissions();
  const [expenses, setExpenses] = useState<ExpenseWithProject[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseWithProject[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Form data
  const [formData, setFormData] = useState({
    project_id: '',
    category: '' as ExpenseCategory | '',
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    receipt_url: '',
  });

  // Calculate totals
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const expensesByCategory = filteredExpenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
    return acc;
  }, {} as Record<ExpenseCategory, number>);

  useEffect(() => {
    fetchData();
  }, []);

  const filterExpenses = useCallback(() => {
    let filtered = [...expenses];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (expense) =>
          expense.description.toLowerCase().includes(query) ||
          expense.project?.title.toLowerCase().includes(query) ||
          expense.category.toLowerCase().includes(query)
      );
    }

    // Project filter
    if (projectFilter && projectFilter !== 'all') {
      filtered = filtered.filter((expense) => expense.project_id === projectFilter);
    }

    // Category filter
    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter((expense) => expense.category === categoryFilter);
    }

    setFilteredExpenses(filtered);
  }, [expenses, searchQuery, projectFilter, categoryFilter]);

  useEffect(() => {
    filterExpenses();
  }, [filterExpenses]);

  const fetchData = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // Fetch expenses
      const expensesData = await getUserExpenses(user.id);
      setExpenses(expensesData);

      // Fetch projects for the filter and create dialog
      const { data: ownedProjects } = await supabase
        .from('projects')
        .select('*')
        .eq('created_by', user.id);

      const { data: memberProjects } = await supabase
        .from('project_members')
        .select('project_id, projects(*)')
        .eq('user_id', user.id);

      const allProjects: Project[] = [...(ownedProjects || [])];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memberProjects?.forEach((pm: any) => {
        if (pm.projects && !allProjects.find((p) => p.id === pm.project_id)) {
          allProjects.push(pm.projects);
        }
      });

      setProjects(allProjects);

      // Subscribe to real-time updates
      const channel = supabase
        .channel('expenses-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'expenses',
          },
          async () => {
            // Refetch expenses when changes occur
            const updatedExpenses = await getUserExpenses(user.id);
            setExpenses(updatedExpenses);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('User not authenticated');

      await createExpense(
        {
          project_id: formData.project_id,
          category: formData.category as ExpenseCategory,
          description: formData.description,
          amount: parseFloat(formData.amount),
          expense_date: formData.expense_date,
          receipt_url: formData.receipt_url || null,
          created_by: user.id,
        },
        user.id
      );

      // Reset form
      setFormData({
        project_id: '',
        category: '',
        description: '',
        amount: '',
        expense_date: new Date().toISOString().split('T')[0],
        receipt_url: '',
      });

      setIsCreateDialogOpen(false);

      // Refresh expenses
      const updatedExpenses = await getUserExpenses(user.id);
      setExpenses(updatedExpenses);
    } catch (error) {
      console.error('Error creating expense:', error);
      alert('Failed to create expense');
    } finally {
      setIsCreating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCategoryLabel = (category: ExpenseCategory) => {
    return category
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Budget & Expenses</h1>
          <p className="text-muted-foreground mt-1">
            {permissions.isCrew ? 'View project expenses and spending' : 'Track expenses and monitor spending'}
          </p>
          {permissions.isCrew && (
            <Badge variant="secondary" className="mt-2">
              <Eye className="mr-1 h-3 w-3" />
              Read-Only Access
            </Badge>
          )}
        </div>
        {permissions.canCreateExpense && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
              <DialogDescription>Record a new expense for your project</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project_id">Project *</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as ExpenseCategory })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="crew">Crew</SelectItem>
                    <SelectItem value="location">Location</SelectItem>
                    <SelectItem value="post-production">Post-Production</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What was this expense for?"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (KSH) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expense_date">Date *</Label>
                  <Input
                    id="expense_date"
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="receipt_url">Receipt URL (Optional)</Label>
                <Input
                  id="receipt_url"
                  type="url"
                  value={formData.receipt_url}
                  onChange={(e) => setFormData({ ...formData, receipt_url: e.target.value })}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground">
                  Link to receipt image or document
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Expense'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">{filteredExpenses.length} transactions</p>
          </CardContent>
        </Card>

        {Object.entries(expensesByCategory)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([category, amount]) => (
            <Card key={category}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {getCategoryLabel(category as ExpenseCategory)}
                </CardTitle>
                {CATEGORY_ICONS[category as ExpenseCategory]}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(amount)}</div>
                <p className="text-xs text-muted-foreground">
                  {((amount / totalExpenses) * 100).toFixed(1)}% of total
                </p>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* AI Insights Widget */}
      <AIInsightsWidget 
        budget={projects.reduce((sum, project) => sum + (project.budget || 0), 0)}
        expenses={expenses}
        aiProvider="deepseek"
        apiKey={process.env.NEXT_PUBLIC_AI_API_KEY}
      />

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search expenses..."
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-filter">Project</Label>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger id="project-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-filter">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger id="category-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="crew">Crew</SelectItem>
                <SelectItem value="location">Location</SelectItem>
                <SelectItem value="post-production">Post-Production</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setProjectFilter('all');
                setCategoryFilter('all');
              }}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <DollarSign className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">
              {expenses.length === 0 ? 'No expenses yet' : 'No expenses match your filters'}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {expenses.length === 0
                ? permissions.canCreateExpense
                  ? 'Start tracking your production expenses by adding your first expense.'
                  : 'No budget expenses recorded yet. Expense information will be visible once your manager logs expenses.'
                : 'Try adjusting your filters to see more expenses.'}
            </p>
            {expenses.length === 0 && permissions.canCreateExpense && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={CATEGORY_COLORS[expense.category]}
                        >
                          <span className="mr-1">{CATEGORY_ICONS[expense.category]}</span>
                          {getCategoryLabel(expense.category)}
                        </Badge>
                        {expense.receipt_url && (
                          <a
                            href={expense.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Receipt className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                      <p className="font-medium">{expense.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{expense.project?.title}</span>
                        <span>•</span>
                        <span>{formatDate(expense.expense_date)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{formatCurrency(Number(expense.amount))}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
