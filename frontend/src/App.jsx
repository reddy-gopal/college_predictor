import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import PredictCollegeForm from './components/PredictCollegeForm'
import PredictRank from './components/PredictRank'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import CollegeCard from './components/CollegeCard'
import RankResultCard from './components/RankResultCard'
import Footer from './components/Footer'
import './App.css'

function App() {
  const [collegeResults, setCollegeResults] = useState([]);
  const [rankResults, setRankResults] = useState(null);

  // Common wrapper for content
  const PageLayout = ({ children }) => (
    <div className="tab-content-wrapper">
      <div className="tab-content active" style={{ display: 'block' }}>
        {children}
      </div>
    </div>
  );

  return (
    <div className="app">
      <Navbar />
      <div className="app-content">
        <Routes>
          <Route path="/" element={
            <>
              <HeroSection
                title="Predict Your Rank"
                subtitle="Based on Score or Percentile"
                description="Get accurate rank estimations using our advanced algorithm powered by years of historical data."
                features={[
                  { icon: "📊", text: "Rank Estimation" },
                  { icon: "✅", text: "Accurate Results" },
                  { icon: "⚡", text: "Instant Output" }
                ]}
                showTabs={true}
              />
              <PageLayout>
                <PredictRank setResults={setRankResults} rankResults={rankResults} />
              </PageLayout>
            </>
          } />

          <Route path="/predict-college" element={
            <>
              <HeroSection
                title="Find Your Dream College"
                subtitle="Based on your Rank & Category"
                description="Discover the best colleges you are eligible for. Filter by state, category, and exam type."
                features={[
                  { icon: "🎓", text: "College Search" },
                  { icon: "📍", text: "State Filters" },
                  { icon: "🔍", text: "Cutoff Analysis" }
                ]}
                showTabs={true}
              />
              <PageLayout>
                <PredictCollegeForm setResults={setCollegeResults} />
                {collegeResults.length > 0 && (
                  <div className="results-container">
                    <div className="results-header">
                      <h2 className="results-title">Eligible Colleges</h2>
                      <span className="results-count">{collegeResults.length} {collegeResults.length === 1 ? 'college found' : 'colleges found'}</span>
                    </div>
                    <div className="college-grid">
                      {collegeResults.map((result, index) => (
                        <CollegeCard key={index} college={result} index={index} />
                      ))}
                    </div>
                  </div>
                )}
              </PageLayout>
            </>
          } />
        </Routes>
      </div>
      <Footer />
    </div>
  )
}

export default App
