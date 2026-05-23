import React, { useState } from 'react';
import { Crosshair, Layers, Maximize2, Moon, Route, Sun } from 'lucide-react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import MapView from '../components/map/MapView';
import { useAlerts } from '../contexts/AlertContext';

const MapPage: React.FC = () => {
  const { sectors, incidents, cameras } = useAlerts();
  const [heatmapMode, setHeatmapMode] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showPatrols, setShowPatrols] = useState(true);
  const [followLatest, setFollowLatest] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow bg-army-khaki-50 py-6">
        <div className={`mx-auto px-4 ${fullscreen ? 'max-w-none' : 'container'}`}>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-headline font-bold text-army-green-800">Border Intelligence Map</h1>
              <p className="text-sm text-gray-600">Realtime Firestore incidents, sectors, surveillance towers, patrol routes, and officer locations.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={`btn ${heatmapMode ? 'btn-primary' : 'btn-secondary'} flex items-center`} onClick={() => setHeatmapMode((enabled) => !enabled)}>
                <Layers className="h-4 w-4 mr-1" />
                Heatmap
              </button>
              <button className={`btn ${showPatrols ? 'btn-primary' : 'btn-secondary'} flex items-center`} onClick={() => setShowPatrols((enabled) => !enabled)}>
                <Route className="h-4 w-4 mr-1" />
                Patrols
              </button>
              <button className={`btn ${followLatest ? 'btn-primary' : 'btn-secondary'} flex items-center`} onClick={() => setFollowLatest((enabled) => !enabled)}>
                <Crosshair className="h-4 w-4 mr-1" />
                Zoom to Alert
              </button>
              <button className="btn btn-secondary flex items-center" onClick={() => setDarkMode((enabled) => !enabled)}>
                {darkMode ? <Sun className="h-4 w-4 mr-1" /> : <Moon className="h-4 w-4 mr-1" />}
                Map Tone
              </button>
              <button className="btn btn-secondary flex items-center" onClick={() => setFullscreen((enabled) => !enabled)}>
                <Maximize2 className="h-4 w-4 mr-1" />
                Fullscreen
              </button>
            </div>
          </div>

          <div className={`grid grid-cols-1 gap-6 ${fullscreen ? '' : 'lg:grid-cols-4'}`}>
            <div className={fullscreen ? '' : 'lg:col-span-3'}>
              <MapView darkMode={darkMode} heatmapMode={heatmapMode} showPatrols={showPatrols} followLatest={followLatest} />
            </div>

            {!fullscreen && (
              <div>
                <div className="bg-white rounded-lg shadow-md overflow-hidden sticky top-20">
                  <div className="border-b px-4 py-3">
                    <h2 className="text-lg font-headline font-semibold">Operational Layers</h2>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-army-khaki-50 rounded p-2">
                        <p className="text-2xl font-headline font-black text-army-green-800">{incidents.length}</p>
                        <p className="text-[10px] uppercase text-gray-500">Incidents</p>
                      </div>
                      <div className="bg-army-khaki-50 rounded p-2">
                        <p className="text-2xl font-headline font-black text-army-green-800">{sectors.length}</p>
                        <p className="text-[10px] uppercase text-gray-500">Sectors</p>
                      </div>
                      <div className="bg-army-khaki-50 rounded p-2">
                        <p className="text-2xl font-headline font-black text-army-green-800">{cameras.length}</p>
                        <p className="text-[10px] uppercase text-gray-500">Cameras</p>
                      </div>
                    </div>

                    <ul className="space-y-3">
                      {sectors.map((zone) => (
                        <li key={zone.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                          <p className="font-medium text-army-green-800 flex items-center">
                            <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                              zone.threatLevel === 'normal' ? 'bg-green-500' :
                              zone.threatLevel === 'elevated' ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                            {zone.name}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">Threat Level: <span className="font-medium capitalize">{zone.threatLevel}</span></p>
                          <p className="text-sm text-gray-600">Unit: <span className="font-medium">{zone.responsibleUnit}</span></p>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 text-xs text-gray-600">
                    <p className="font-bold mb-1">Marker Legend</p>
                    <div className="grid grid-cols-2 gap-2">
                      <span><i className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1" />Low</span>
                      <span><i className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-1" />Medium</span>
                      <span><i className="inline-block w-3 h-3 rounded-full bg-orange-500 mr-1" />High</span>
                      <span><i className="inline-block w-3 h-3 rounded-full bg-red-600 mr-1" />Critical</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MapPage;
