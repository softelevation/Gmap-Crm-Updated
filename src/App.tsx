import React, { useEffect, useState } from 'react'
import './App.css'
import { TableResults } from './components/TableResults'
import { SearchWidget } from './components/SearchWidget'
import { MapWidget } from './components/MapWidget'
import { filterRecordsByDistance, getGoogleMapsApiKeyFromCRM, getRecords, getAddressGeocode } from './services/crmDataFetcher'
import { ResultItemType, ResultsType } from './types'

function renderResultsWidget (setResultsSortedByDistance: (T: ResultItemType[]) => void, resultsSortedByDistance: ResultItemType[], googleMapsApiKey?: string, results?: ResultsType) {
    if (results && googleMapsApiKey) {
        return (
            <MapWidget
                mapsApiKey={googleMapsApiKey}
                results={results}
                setResultsSortedByDistance={setResultsSortedByDistance}
                resultsSortedByDistance={resultsSortedByDistance}
            />
        )
    }
}

function App () {
    const [searchParameters, changeSearchParameters] = useState({
        searchAddress: {
            Street: '7450 Cypress Gardens Blvd',
            City: 'Winter Haven',
            State: 'FL',
            Zip: '33884'
        },
        readyForSearch: false
    })
    const [results, updateResults] = useState<ResultsType>({
        addressesToRender: null,
        centrePoint: null
    })
    const [googleMapsApiKey, updateGoogleMapsApiKey] = useState('')
    const [resultsSortedByDistance, setResultsSortedByDistance] = useState<ResultItemType[]>([])
	
	 
    useEffect(() => {
        const getRecordsAPI = async () => {
            const records = await getRecords(1)
            localStorage.setItem('cachedLeads', JSON.stringify(records))
        }
        void getRecordsAPI()
    }, [])

    useEffect(() => {
        if (searchParameters.readyForSearch) {
			
            const getDataFromCrm = async () => {
				

                const geocode = await getAddressGeocode({
                    searchAddress: searchParameters.searchAddress,
                    apiKey: googleMapsApiKey
                })
				
				// lets update the google map api if needed..
				if (geocode.geo_response_status == "OVER_QUERY_LIMIT") {
					//lets pull the zoho crm 
					const apiKey = await getGoogleMapsApiKeyFromCRM('googleMapsApiKey2')
					updateGoogleMapsApiKey(apiKey)
				}
			
				const records = localStorage.getItem('cachedLeads')
                if (records && geocode.coordinates) {
                    const parsedRecords = JSON.parse(records)
                    results.centrePoint = {
                        latitude: parseFloat(geocode.coordinates.latitude),
                        longitude: parseFloat(geocode.coordinates.longitude)
                    }
                    const sortedByDistance: unknown = await filterRecordsByDistance(geocode.coordinates, parsedRecords)
                    results.addressesToRender = sortedByDistance as ResultItemType[]
                    updateResults(results)
                } else {
                    alert('Unable to get address coordinates.')
                }
                // const [filteredRecords, geocode] = await Promise.all([
                //     filterRecordsByState(searchParameters.searchAddress.State as keyof typeof states),
                //     getAddressGeocode({
                //         searchAddress: searchParameters.searchAddress,
                //         apiKey: googleMapsApiKey
                //     })
                // ])
                // if (filteredRecords && geocode.coordinates) {
                //     results.centrePoint = {
                //         latitude: parseFloat(geocode.coordinates.latitude),
                //         longitude: parseFloat(geocode.coordinates.longitude)
                //     }
                //     const sortedByDistance: unknown = await filterRecordsByDistance(geocode.coordinates, filteredRecords)
                //     results.addressesToRender = sortedByDistance as ResultItemType[]
                //     updateResults(results)
                // } else {
                //     alert('Unable to get address coordinates.')
                // }
            }
            void getDataFromCrm()
        }
    }, [searchParameters])

    useEffect(() => {
        const getMapsApiKeyFromCRM = async () => {
            const apiKey = await getGoogleMapsApiKeyFromCRM('googleMapsApiKey1')
            updateGoogleMapsApiKey(apiKey)
        }
        void getMapsApiKeyFromCRM()
    }, [])

    return (
        <div className="App">
            <SearchWidget changeSearchParameters={changeSearchParameters} searchParameters={searchParameters} />
            {renderResultsWidget(setResultsSortedByDistance, resultsSortedByDistance, googleMapsApiKey, results)}
            <TableResults results={resultsSortedByDistance} />
        </div>
    )
}

export default App
