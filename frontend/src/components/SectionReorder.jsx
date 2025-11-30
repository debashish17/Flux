import React, { useState } from 'react';
import { GripVertical } from 'lucide-react';

export default function SectionReorder({ sections, onReorder }) {
  const [localSections, setLocalSections] = useState(sections);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Keep localSections in sync with prop changes
  React.useEffect(() => {
    setLocalSections(sections);
  }, [sections]);

  const moveSection = (fromIdx, toIdx) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= localSections.length || toIdx >= localSections.length) return;

    // Capture section ID BEFORE mutating array
    const sectionId = localSections[fromIdx].id;

    const updated = [...localSections];
    const [removed] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, removed);
    setLocalSections(updated);

    // Use captured ID
    onReorder(sectionId, toIdx);
  };

  const handleDragStart = (index) => setDraggedIndex(index);
  const handleDragEnd = () => setDraggedIndex(null);
  const handleDrop = (index) => {
    if (draggedIndex === null || draggedIndex === index) return;
    moveSection(draggedIndex, index);
    setDraggedIndex(null);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600 mb-4">Drag and drop sections to reorder them</p>
      {localSections.map((section, idx) => (
        <div
          key={section.id}
          className={`flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border-2 transition-all ${
            draggedIndex === idx
              ? 'opacity-50 border-indigo-400 shadow-lg'
              : 'border-gray-200 hover:border-gray-300'
          }`}
          draggable
          onDragStart={() => handleDragStart(idx)}
          onDragEnd={handleDragEnd}
          onDragOver={e => e.preventDefault()}
          onDrop={() => handleDrop(idx)}
        >
          <GripVertical className="w-5 h-5 text-gray-400 cursor-grab active:cursor-grabbing" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {idx + 1}
              </span>
              <span className="text-sm font-medium text-gray-900">{section.title}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
