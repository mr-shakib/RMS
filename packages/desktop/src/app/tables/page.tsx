'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTables } from '@/hooks/useTables';
import { TableStatus } from '@rms/shared';
import {
  PlusIcon,
  QrCodeIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type TableStatusFilter = 'ALL' | TableStatus;

const STATUS_FILTERS: { label: string; value: TableStatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Free', value: TableStatus.FREE },
  { label: 'Occupied', value: TableStatus.OCCUPIED },
  { label: 'Reserved', value: TableStatus.RESERVED },
];

export default function TablesPage() {
  const router = useRouter();
  const { tables, isLoading, createTable, updateTable, deleteTable, isCreating, isUpdating, isDeleting } = useTables();
  const [statusFilter, setStatusFilter] = useState<TableStatusFilter>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [selectedStatus, setSelectedStatus] = useState<TableStatus | null>(null);
  const [newTableName, setNewTableName] = useState('');
  const [editTableName, setEditTableName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Helper function to extract table number from name
  const getTableNumber = (tableName: string): number => {
    const match = tableName.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  // Filter and sort tables by status and number
  const filteredTables = useMemo(() => {
    let filtered = statusFilter === 'ALL' ? tables : tables.filter((table) => table.status === statusFilter);
    
    // Sort by table number (extracted from name)
    return filtered.sort((a, b) => {
      const numA = getTableNumber(a.name);
      const numB = getTableNumber(b.name);
      return numA - numB;
    });
  }, [tables, statusFilter]);

  // Handle add table
  const handleAddTable = async () => {
    if (!newTableName.trim()) {
      setError('Table number is required');
      return;
    }

    try {
      setError(null);
      // Auto-prefix with "Table " if not already present
      const tableName = newTableName.trim().toLowerCase().startsWith('table ')
        ? newTableName.trim()
        : `Table ${newTableName.trim()}`;
      
      await createTable({ name: tableName });
      setNewTableName('');
      setShowAddModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create table');
    }
  };

  // Handle edit table
  const handleEditTable = async () => {
    if (!editTableName.trim()) {
      setError('Table name is required');
      return;
    }

    if (!selectedTable) return;

    try {
      setError(null);
      await updateTable({ id: selectedTable.id, data: { name: editTableName.trim() } });
      setShowEditModal(false);
      setSelectedTable(null);
      setEditTableName('');
    } catch (err: any) {
      setError(err.message || 'Failed to update table');
    }
  };

  // Handle delete table
  const handleDeleteTable = async () => {
    if (!selectedTable) return;

    try {
      setError(null);
      await deleteTable(selectedTable.id);
      setShowDeleteModal(false);
      setSelectedTable(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete table');
    }
  };

  // Open edit modal
  const openEditModal = (table: any) => {
    setSelectedTable(table);
    setEditTableName(table.name);
    setError(null);
    setShowEditModal(true);
  };

  // Open QR modal
  const openQRModal = (table: any) => {
    setSelectedTable(table);
    setShowQRModal(true);
  };

  // Open delete modal
  const openDeleteModal = (table: any) => {
    setSelectedTable(table);
    setError(null);
    setShowDeleteModal(true);
  };

  // Open status change modal
  const openStatusModal = (table: any) => {
    setSelectedTable(table);
    setSelectedStatus(table.status);
    setError(null);
    setShowStatusModal(true);
  };

  // Handle status change
  const handleStatusChange = async () => {
    if (!selectedTable || !selectedStatus) return;

    try {
      setError(null);
      await updateTable({ id: selectedTable.id, data: { status: selectedStatus } });
      setShowStatusModal(false);
      setSelectedTable(null);
      setSelectedStatus(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update table status');
    }
  };

  // Download QR code as image
  const downloadQRCode = () => {
    if (!selectedTable) return;
    
    const link = document.createElement('a');
    link.href = selectedTable.qrCodeUrl;
    link.download = `${selectedTable.name}-QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download QR code as PDF
  const downloadQRCodePDF = async () => {
    if (!selectedTable) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/tables/${selectedTable.id}/qr/download`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download QR code PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `table-${selectedTable.name}-qr.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading QR code PDF:', err);
      setError('Failed to download QR code PDF');
    }
  };

  // Download all QR codes as PDF
  const downloadAllQRCodes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/tables/qr/download-all', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download all QR codes');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'all-tables-qr.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading all QR codes:', err);
      setError('Failed to download all QR codes');
    }
  };

  // Regenerate all QR codes
  const regenerateAllQRCodes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/tables/qr/regenerate-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate QR codes');
      }

      // Refresh tables to get updated QR codes
      window.location.reload();
    } catch (err) {
      console.error('Error regenerating QR codes:', err);
      setError('Failed to regenerate QR codes');
    }
  };

  // Handle table click to create order
  const handleTableClick = (table: any) => {
    router.push(`/tables/${table.id}/order`);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tables</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage restaurant tables and QR codes
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={downloadAllQRCodes}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 
                     text-white rounded-lg transition-colors"
            title="Download all QR codes as PDF"
          >
            <QrCodeIcon className="w-5 h-5" />
            Download All QR Codes
          </button>
          <button
            onClick={() => {
              setNewTableName('');
              setError(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 
                     text-white rounded-lg transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add Table
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors
                ${
                  statusFilter === filter.value
                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              {filter.label}
              <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                {filter.value === 'ALL'
                  ? tables.length
                  : tables.filter((t) => t.status === filter.value).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tables Grid */}
      <div>
        {isLoading ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading tables...</span>
            </div>
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 text-lg">No tables found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                {statusFilter === 'ALL'
                  ? 'Click "Add Table" to create your first table'
                  : `No tables with status "${statusFilter}"`}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTables.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                onClick={() => handleTableClick(table)}
                onEdit={() => openEditModal(table)}
                onViewQR={() => openQRModal(table)}
                onDelete={() => openDeleteModal(table)}
                onChangeStatus={() => openStatusModal(table)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Table Modal */}
      {showAddModal && (
        <Modal
          title="Add New Table"
          onClose={() => setShowAddModal(false)}
        >
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Table Number
              </label>
              <input
                type="text"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="e.g., 1, 2, 3"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && handleAddTable()}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Will be created as "Table {newTableName || 'X'}"
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                         dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTable}
                disabled={isCreating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create Table'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Table Modal */}
      {showEditModal && selectedTable && (
        <Modal
          title="Edit Table"
          onClose={() => setShowEditModal(false)}
        >
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Table Name
              </label>
              <input
                type="text"
                value={editTableName}
                onChange={(e) => setEditTableName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => e.key === 'Enter' && handleEditTable()}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                         dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditTable}
                disabled={isUpdating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedTable && (
        <Modal
          title={`QR Code - ${selectedTable.name}`}
          onClose={() => setShowQRModal(false)}
        >
          <div className="space-y-4">
            <div className="flex justify-center p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <img
                src={selectedTable.qrCodeUrl}
                alt={`QR Code for ${selectedTable.name}`}
                className="w-64 h-64"
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Scan this QR code to access the ordering menu for {selectedTable.name}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowQRModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                         dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={downloadQRCode}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg 
                         transition-colors"
              >
                Download PNG
              </button>
              <button
                onClick={downloadQRCodePDF}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                         transition-colors"
              >
                Download PDF
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedTable && (
        <Modal
          title="Delete Table"
          onClose={() => setShowDeleteModal(false)}
        >
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            <p className="text-gray-700 dark:text-gray-300">
              Are you sure you want to delete <strong>{selectedTable.name}</strong>?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This action cannot be undone. Tables with active orders cannot be deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                         dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTable}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg 
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete Table'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Change Status Modal */}
      {showStatusModal && selectedTable && (
        <Modal
          title="Change Table Status"
          onClose={() => setShowStatusModal(false)}
        >
          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Status for {selectedTable.name}
              </label>
              <div className="space-y-2">
                {Object.values(TableStatus).map((status) => (
                  <label
                    key={status}
                    className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors
                      ${
                        selectedStatus === status
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={status}
                      checked={selectedStatus === status}
                      onChange={(e) => setSelectedStatus(e.target.value as TableStatus)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                      {status}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                         dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusChange}
                disabled={isUpdating || selectedStatus === selectedTable.status}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg 
                         transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Table Card Component
interface TableCardProps {
  table: any;
  onClick: () => void;
  onEdit: () => void;
  onViewQR: () => void;
  onDelete: () => void;
  onChangeStatus: () => void;
}

function TableCard({ table, onClick, onEdit, onViewQR, onDelete, onChangeStatus }: TableCardProps) {
  const statusColors: Record<TableStatus, { bg: string; text: string; border: string }> = {
    [TableStatus.FREE]: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-700 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800',
    },
    [TableStatus.OCCUPIED]: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800',
    },
    [TableStatus.RESERVED]: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      text: 'text-yellow-700 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-800',
    },
  };

  const statusStyle = statusColors[table.status as TableStatus];

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg 
                 transition-all p-6 border-2 ${statusStyle.border} cursor-pointer
                 hover:scale-105 transform`}
    >
      {/* Status Badge */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChangeStatus();
          }}
          className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text} 
                     hover:opacity-80 transition-opacity cursor-pointer`}
          title="Click to change status"
        >
          {table.status}
        </button>
      </div>

      {/* Table Name */}
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        {table.name}
      </h3>

      {/* Table Info */}
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        <p>Click to create order</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewQR();
          }}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 
                   bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 
                   hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
          title="View QR Code"
        >
          <QrCodeIcon className="w-4 h-4" />
          <span className="text-xs font-medium">QR Code</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="flex items-center justify-center px-3 py-2 
                   bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 
                   hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
          title="Edit Table"
        >
          <PencilIcon className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex items-center justify-center px-3 py-2 
                   bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 
                   hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          title="Delete Table"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Modal Component
interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
