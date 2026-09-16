import React from 'react';

interface BillingItemSelectProps {
  value: string;
  onChange: (itemId: string, selectedItem?: any) => void;
  items: any[];
  documentType?: 'SALES' | 'QUOTATION' | 'PURCHASE' | 'DELIVERY_CHALLAN' | 'SERVICE' | string;
  placeholder?: string;
  className?: string;
}

export const BillingItemSelect: React.FC<BillingItemSelectProps> = ({
  value,
  onChange,
  items = [],
  documentType = 'SALES',
  placeholder = '-- Select Product / Item --',
  className = '',
}) => {
  const isCustomerBilling = documentType === 'SALES' || documentType === 'QUOTATION';

  // Helper to categorize item into optgroups
  const getItemCategoryGroup = (item: any) => {
    const cat = item.itemCategory || '';
    const type = item.type || '';
    const name = (item.name || '').toLowerCase();

    if (cat === 'MILKING_MACHINE' || name.includes('milking')) return 'MILKING_MACHINE';
    if (cat === 'CHAFF_CUTTER' || name.includes('chaff')) return 'CHAFF_CUTTER';
    if (cat === 'SPRAYER' || name.includes('sprayer') || name.includes('fogger')) return 'SPRAYER';
    if (cat === 'PRESSURE_WASHER' || name.includes('washer') || name.includes('pressure')) return 'PRESSURE_WASHER';
    if (cat === 'SOLAR_MACHINE' || name.includes('solar')) return 'SOLAR_MACHINE';
    if (cat === 'BATTERY_PETROL_MACHINE' || name.includes('brush') || name.includes('auger') || name.includes('petrol')) return 'BATTERY_PETROL_MACHINE';
    if (cat === 'FINISHED_MACHINE' || type === 'FINISHED_MACHINE') return 'FINISHED_MACHINE';
    if (cat === 'SPARE_PART' || type === 'SPARE_PART') return 'SPARE_PART';
    if (cat === 'COMPONENT' || type === 'COMPONENT') return 'COMPONENT';
    if (cat === 'RAW_MATERIAL' || type === 'RAW_MATERIAL') return 'RAW_MATERIAL';
    return 'OTHER';
  };

  // Group items by category
  const finishedMachinesGroup = items.filter((i) => {
    const g = getItemCategoryGroup(i);
    return ['MILKING_MACHINE', 'CHAFF_CUTTER', 'SPRAYER', 'PRESSURE_WASHER', 'SOLAR_MACHINE', 'BATTERY_PETROL_MACHINE', 'FINISHED_MACHINE'].includes(g);
  });

  const sparePartsGroup = items.filter((i) => getItemCategoryGroup(i) === 'SPARE_PART');
  const componentsGroup = items.filter((i) => getItemCategoryGroup(i) === 'COMPONENT');
  const rawMaterialsGroup = items.filter((i) => getItemCategoryGroup(i) === 'RAW_MATERIAL');
  const otherGroup = items.filter((i) => getItemCategoryGroup(i) === 'OTHER');

  // Filter out internal components/raw materials for default Customer Billing dropdown unless selected
  const displayComponents = isCustomerBilling
    ? componentsGroup.filter((i) => i.id === value || i.showInBilling === true)
    : componentsGroup;

  const displayRawMaterials = isCustomerBilling
    ? rawMaterialsGroup.filter((i) => i.id === value || i.showInBilling === true)
    : rawMaterialsGroup;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const itemObj = items.find((i) => i.id === selectedId);
    onChange(selectedId, itemObj);
  };

  return (
    <select
      value={value}
      onChange={handleChange}
      className={
        className ||
        'w-full p-2 border border-slate-300 rounded-xl font-bold text-slate-900 bg-white text-xs focus:ring-2 focus:ring-emerald-500 shadow-sm'
      }
    >
      <option value="">{placeholder}</option>

      {/* 1. READY / FINISHED MACHINES (PRIORITY 1) */}
      {finishedMachinesGroup.length > 0 && (
        <optgroup label="🚜 READY / FINISHED MACHINES (SAM Products)">
          {finishedMachinesGroup.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.sku}) | Stock: {item.currentStock} {item.unit} | ₹{item.sellingPrice ? item.sellingPrice.toLocaleString('en-IN') : '0'}
            </option>
          ))}
        </optgroup>
      )}

      {/* 2. SPARE PARTS (PRIORITY 2) */}
      {sparePartsGroup.length > 0 && (
        <optgroup label="🔧 SPARE PARTS & REPLACEMENTS">
          {sparePartsGroup.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.sku}) | Stock: {item.currentStock} {item.unit} | ₹{item.sellingPrice ? item.sellingPrice.toLocaleString('en-IN') : '0'}
            </option>
          ))}
        </optgroup>
      )}

      {/* 3. OTHER PRODUCTS / EQUIPMENT */}
      {otherGroup.length > 0 && (
        <optgroup label="📦 OTHER EQUIPMENT & CONTAINERS">
          {otherGroup.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.sku}) | Stock: {item.currentStock} {item.unit} | ₹{item.sellingPrice ? item.sellingPrice.toLocaleString('en-IN') : '0'}
            </option>
          ))}
        </optgroup>
      )}

      {/* 4. COMPONENTS (Shown for DC, Service, Purchase, or if permitted) */}
      {displayComponents.length > 0 && (
        <optgroup label="⚙️ INTERNAL COMPONENTS (Motors, Pumps, Panels)">
          {displayComponents.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.sku}) | Stock: {item.currentStock} {item.unit} | ₹{item.sellingPrice ? item.sellingPrice.toLocaleString('en-IN') : '0'}
            </option>
          ))}
        </optgroup>
      )}

      {/* 5. RAW MATERIALS & FASTENERS (Shown for DC, Service, Purchase, or if searched) */}
      {displayRawMaterials.length > 0 && (
        <optgroup label="🧱 RAW MATERIALS & HARDWARE (Bolts, Nuts, Steel)">
          {displayRawMaterials.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.sku}) | Stock: {item.currentStock} {item.unit} | ₹{item.sellingPrice ? item.sellingPrice.toLocaleString('en-IN') : '0'}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
};
