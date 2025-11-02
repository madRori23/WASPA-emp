// export.js - Export to Excel functionality with Firebase integration
class ExportManager {
    constructor() {
        this.exportTestsBtn = document.getElementById('exportTests');
        this.exportWarningsBtn = document.getElementById('exportWarnings');
        this.exportAllBtn = document.getElementById('exportAll');
        this.exportFilteredBtn = document.getElementById('exportFiltered');
        
        this.init();
    }

    init() {
        this.exportTestsBtn.addEventListener('click', () => this.exportTests());
        this.exportWarningsBtn.addEventListener('click', () => this.exportWarnings());
        this.exportAllBtn.addEventListener('click', () => this.exportAllData());
        
        if (this.exportFilteredBtn) {
            this.exportFilteredBtn.addEventListener('click', () => this.exportFilteredData());
        }

        // Update export stats when data changes
        dataManager.addListener(() => {
            this.updateExportStats();
        });

        this.updateExportStats();
    }

    async exportTests() {
        try {
            showLoading();
            
            const tests = dataManager.getTests();
            
            if (tests.length === 0) {
                this.showExportError('No test records found to export.');
                return;
            }

            const worksheet = XLSX.utils.json_to_sheet(this.formatTestsForExport(tests));
            const workbook = XLSX.utils.book_new();
            
            // Set column widths
            const colWidths = [
                { wch: 12 }, // Date
                { wch: 15 }, // Type
                { wch: 10 }, // Network
                { wch: 50 }, // Description
                { wch: 15 }, // Result
                { wch: 20 }, // Created By
                { wch: 20 }  // Created At
            ];
            worksheet['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(workbook, worksheet, "Tests");
            XLSX.writeFile(workbook, `WASPA_Tests_${this.getCurrentDate()}.xlsx`);
            
            this.recordExport();
            this.showExportSuccess(`${tests.length} test records exported successfully!`);
        } catch (error) {
            console.error('Error exporting tests:', error);
            this.showExportError('Failed to export tests. Please try again.');
        } finally {
            hideLoading();
        }
    }

    async exportWarnings() {
        try {
            showLoading();
            
            const warnings = dataManager.getWarnings();
            
            if (warnings.length === 0) {
                this.showExportError('No warning records found to export.');
                return;
            }

            const worksheet = XLSX.utils.json_to_sheet(this.formatWarningsForExport(warnings));
            const workbook = XLSX.utils.book_new();
            
            // Set column widths for warnings
            const colWidths = [
                { wch: 12 }, // Date
                { wch: 20 }, // Warning Type
                { wch: 30 }, // Recipient
                { wch: 15 }, // Reference
                { wch: 50 }, // Details
                { wch: 50 }, // Problem Areas
                { wch: 20 }, // Created By
                { wch: 20 }  // Created At
            ];
            worksheet['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(workbook, worksheet, "Warnings");
            XLSX.writeFile(workbook, `WASPA_Warnings_${this.getCurrentDate()}.xlsx`);
            
            this.recordExport();
            this.showExportSuccess(`${warnings.length} warning records exported successfully!`);
        } catch (error) {
            console.error('Error exporting warnings:', error);
            this.showExportError('Failed to export warnings. Please try again.');
        } finally {
            hideLoading();
        }
    }

    async exportAllData() {
        try {
            showLoading();
            
            const tests = dataManager.getTests();
            const warnings = dataManager.getWarnings();

            if (tests.length === 0 && warnings.length === 0) {
                this.showExportError('No data found to export.');
                return;
            }

            const workbook = XLSX.utils.book_new();
            
            // Tests sheet
            if (tests.length > 0) {
                const testsWorksheet = XLSX.utils.json_to_sheet(this.formatTestsForExport(tests));
                testsWorksheet['!cols'] = [
                    { wch: 12 }, { wch: 15 }, { wch: 10 }, 
                    { wch: 50 }, { wch: 15 }, { wch: 20 }, { wch: 20 }
                ];
                XLSX.utils.book_append_sheet(workbook, testsWorksheet, "Tests");
            }
            
            // Warnings sheet
            if (warnings.length > 0) {
                const warningsWorksheet = XLSX.utils.json_to_sheet(this.formatWarningsForExport(warnings));
                warningsWorksheet['!cols'] = [
                    { wch: 12 }, { wch: 20 }, { wch: 30 }, 
                    { wch: 15 }, { wch: 50 }, { wch: 50 }, 
                    { wch: 20 }, { wch: 20 }
                ];
                XLSX.utils.book_append_sheet(workbook, warningsWorksheet, "Warnings");
            }
            
            // Summary sheet
            const summaryData = this.createSummaryData(tests, warnings);
            const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
            summaryWorksheet['!cols'] = [
                { wch: 25 }, { wch: 25 }
            ];
            XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Summary");

            XLSX.writeFile(workbook, `WASPA_Complete_Report_${this.getCurrentDate()}.xlsx`);
            
            this.recordExport();
            this.showExportSuccess('Complete report exported successfully!');
        } catch (error) {
            console.error('Error exporting all data:', error);
            this.showExportError('Failed to export data. Please try again.');
        } finally {
            hideLoading();
        }
    }

    async exportFilteredData() {
        try {
            showLoading();
            
            const startDate = document.getElementById('exportStartDate').value;
            const endDate = document.getElementById('exportEndDate').value;
            const network = document.getElementById('exportNetwork').value;

            const filteredTests = dataManager.getFilteredTests(startDate, endDate, network);
            const filteredWarnings = dataManager.getFilteredWarnings(startDate, endDate);

            if (filteredTests.length === 0 && filteredWarnings.length === 0) {
                this.showExportError('No data found for the selected filters.');
                return;
            }

            const workbook = XLSX.utils.book_new();
            
            // Filtered Tests sheet
            if (filteredTests.length > 0) {
                const testsWorksheet = XLSX.utils.json_to_sheet(this.formatTestsForExport(filteredTests));
                testsWorksheet['!cols'] = [
                    { wch: 12 }, { wch: 15 }, { wch: 10 }, 
                    { wch: 50 }, { wch: 15 }, { wch: 20 }, { wch: 20 }
                ];
                XLSX.utils.book_append_sheet(workbook, testsWorksheet, "Filtered Tests");
            }
            
            // Filtered Warnings sheet
            if (filteredWarnings.length > 0) {
                const warningsWorksheet = XLSX.utils.json_to_sheet(this.formatWarningsForExport(filteredWarnings));
                warningsWorksheet['!cols'] = [
                    { wch: 12 }, { wch: 20 }, { wch: 30 }, 
                    { wch: 15 }, { wch: 50 }, { wch: 50 }, 
                    { wch: 20 }, { wch: 20 }
                ];
                XLSX.utils.book_append_sheet(workbook, warningsWorksheet, "Filtered Warnings");
            }

            // Filter Summary sheet
            const filterInfo = this.getFilterDescription(startDate, endDate, network);
            const summaryData = [
                { 'Report Type': 'Filtered Data Export' },
                { 'Filter Criteria': filterInfo },
                { 'Export Date': new Date().toLocaleString() },
                { 'Exported By': dataManager.getCurrentUser().email },
                { '': '' }, // Empty row
                { 'Metric': 'Value' },
                { 'Filtered Test Records': filteredTests.length },
                { 'Filtered Warning Records': filteredWarnings.length },
                { 'Date Range': `${startDate || 'Start'} to ${endDate || 'End'}` },
                { 'Network Filter': network || 'All Networks' }
            ];
            
            const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
            summaryWorksheet['!cols'] = [
                { wch: 25 }, { wch: 25 }
            ];
            XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Filter Summary");

            XLSX.writeFile(workbook, `WASPA_Filtered_Report_${this.getCurrentDate()}.xlsx`);
            
            this.recordExport();
            this.showExportSuccess('Filtered data exported successfully!');
        } catch (error) {
            console.error('Error exporting filtered data:', error);
            this.showExportError('Failed to export filtered data. Please try again.');
        } finally {
            hideLoading();
        }
    }

    formatTestsForExport(tests) {
        return tests.map(test => ({
            'Date': this.formatExcelDate(test.date),
            'Test Type': test.type,
            'Network': test.network,
            'Description': test.description,
            'Result': test.result,
            'Created By': test.createdBy,
            'Created At': this.formatExcelDateTime(test.createdAt)
        }));
    }

    formatWarningsForExport(warnings) {
        return warnings.map(warning => ({
            'Date': this.formatExcelDate(warning.date),
            'Warning Type': this.formatWarningType(warning.type),
            'Recipient Member': warning.recipient,
            'Reference Number': warning.reference,
            'Details': warning.details,
            'Problem Areas': warning.problemAreas,
            'Created By': warning.createdBy,
            'Created At': this.formatExcelDateTime(warning.createdAt)
        }));
    }

    createSummaryData(tests, warnings) {
        const today = new Date().toDateString();
        const testsToday = tests.filter(test => new Date(test.date).toDateString() === today).length;
        const warningsToday = warnings.filter(warning => new Date(warning.date).toDateString() === today).length;
        
        const uniqueTestDates = new Set(tests.map(test => test.date));
        const uniqueWarningDates = new Set(warnings.map(warning => warning.date));
        
        // Test results breakdown
        const compliantTests = tests.filter(test => test.result === 'Compliant').length;
        const nonCompliantTests = tests.filter(test => test.result === 'Non-compliant').length;
        const inconclusiveTests = tests.filter(test => test.result === 'inconclusive').length;
        
        // Warning types breakdown
        const complianceWarnings = warnings.filter(warning => warning.type === 'compliance').length;
        const serviceWarnings = warnings.filter(warning => warning.type === 'service').length;
        const pricingWarnings = warnings.filter(warning => warning.type === 'pricing').length;
        const otherWarnings = warnings.filter(warning => warning.type === 'other').length;
        
        // Network breakdown
        const networkStats = {};
        tests.forEach(test => {
            networkStats[test.network] = (networkStats[test.network] || 0) + 1;
        });
        
        const networkBreakdown = Object.entries(networkStats)
            .map(([network, count]) => `${network}: ${count}`)
            .join(', ');

        return [
            { 'WASPA Employee System - Complete Report': '' },
            { 'Generated On': new Date().toLocaleString() },
            { 'Generated By': dataManager.getCurrentUser().email },
            { '': '' },
            { 'OVERVIEW STATISTICS': '' },
            { 'Total Test Records': tests.length },
            { 'Total Warning Records': warnings.length },
            { 'Tests Today': testsToday },
            { 'Warnings Today': warningsToday },
            { 'Active Testing Days': uniqueTestDates.size },
            { 'Active Warning Days': uniqueWarningDates.size },
            { '': '' },
            { 'TEST RESULTS BREAKDOWN': '' },
            { 'Compliant Tests': compliantTests },
            { 'Non-compliant Tests': nonCompliantTests },
            { 'Inconclusive Tests': inconclusiveTests },
            { 'Compliance Rate': tests.length > 0 ? `${((compliantTests / tests.length) * 100).toFixed(1)}%` : '0%' },
            { '': '' },
            { 'WARNING TYPES BREAKDOWN': '' },
            { 'Compliance Issues': complianceWarnings },
            { 'Service Issues': serviceWarnings },
            { 'Pricing Issues': pricingWarnings },
            { 'Other Issues': otherWarnings },
            { '': '' },
            { 'NETWORK DISTRIBUTION': '' },
            { 'Tests by Network': networkBreakdown || 'No data' },
            { '': '' },
            { 'DATA RANGE': '' },
            { 'Earliest Test': tests.length > 0 ? this.formatExcelDate(Math.min(...tests.map(t => t.date))) : 'N/A' },
            { 'Latest Test': tests.length > 0 ? this.formatExcelDate(Math.max(...tests.map(t => t.date))) : 'N/A' },
            { 'Earliest Warning': warnings.length > 0 ? this.formatExcelDate(Math.min(...warnings.map(w => w.date))) : 'N/A' },
            { 'Latest Warning': warnings.length > 0 ? this.formatExcelDate(Math.max(...warnings.map(w => w.date))) : 'N/A' }
        ];
    }

    formatWarningType(type) {
        const typeMap = {
            'compliance': 'Compliance Issue',
            'service': 'Service Issue',
            'pricing': 'Pricing Issue',
            'other': 'Other Issue'
        };
        return typeMap[type] || type;
    }

    formatExcelDate(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatExcelDateTime(dateString) {
        if (!dateString) return 'N/A';
        
        // Handle Firestore timestamps
        let date;
        if (dateString.toDate) {
            date = dateString.toDate();
        } else {
            date = new Date(dateString);
        }
        
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    getFilterDescription(startDate, endDate, network) {
        let description = 'All data';
        if (startDate || endDate || network) {
            description = 'Filtered: ';
            const filters = [];
            if (startDate && endDate) {
                filters.push(`Date: ${this.formatExcelDate(startDate)} to ${this.formatExcelDate(endDate)}`);
            } else if (startDate) {
                filters.push(`From: ${this.formatExcelDate(startDate)}`);
            } else if (endDate) {
                filters.push(`To: ${this.formatExcelDate(endDate)}`);
            }
            if (network) filters.push(`Network: ${network}`);
            description += filters.join(', ');
        }
        return description;
    }

    getCurrentDate() {
        return new Date().toISOString().split('T')[0].replace(/-/g, '');
    }

    updateExportStats() {
        const testCount = dataManager.getTests().length;
        const warningCount = dataManager.getWarnings().length;
        
        document.getElementById('exportTestCount').textContent = testCount;
        document.getElementById('exportWarningCount').textContent = warningCount;
        document.getElementById('lastUpdated').textContent = new Date().toLocaleString();
        
        // Update button states based on data availability
        this.exportTestsBtn.disabled = testCount === 0;
        this.exportWarningsBtn.disabled = warningCount === 0;
        this.exportAllBtn.disabled = testCount === 0 && warningCount === 0;
        
        if (this.exportTestsBtn.disabled) {
            this.exportTestsBtn.title = 'No test records available for export';
        } else {
            this.exportTestsBtn.title = '';
        }
        
        if (this.exportWarningsBtn.disabled) {
            this.exportWarningsBtn.title = 'No warning records available for export';
        } else {
            this.exportWarningsBtn.title = '';
        }
        
        if (this.exportAllBtn.disabled) {
            this.exportAllBtn.title = 'No data available for export';
        } else {
            this.exportAllBtn.title = '';
        }
    }

    recordExport() {
        localStorage.setItem('waspa_last_export', new Date().toISOString());
        if (typeof dashboardManager !== 'undefined') {
            dashboardManager.recordExport();
        }
        this.updateExportStats();
    }

    showExportSuccess(message) {
        this.showExportMessage(message, 'success');
    }

    showExportError(message) {
        this.showExportMessage(message, 'error');
    }

    showExportMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.export-message');
        existingMessages.forEach(msg => msg.remove());

        // Create new message element
        const messageEl = document.createElement('div');
        messageEl.className = `message export-message ${type}`;
        messageEl.style.marginTop = '20px';
        messageEl.style.marginBottom = '20px';
        messageEl.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                ${type === 'success' ? '✅' : '❌'}
                <span>${message}</span>
            </div>
        `;
        
        // Find export card and append message
        const exportCard = document.querySelector('.export-card');
        const dataStats = exportCard.querySelector('.data-stats');
        
        if (dataStats) {
            exportCard.insertBefore(messageEl, dataStats);
        } else {
            exportCard.appendChild(messageEl);
        }
        
        // Auto-hide success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 5000);
        }
    }

    // Advanced export with custom formatting
    async exportFormattedReport() {
        try {
            showLoading();
            
            const tests = dataManager.getTests();
            const warnings = dataManager.getWarnings();
            
            if (tests.length === 0 && warnings.length === 0) {
                this.showExportError('No data found to export.');
                return;
            }

            const workbook = XLSX.utils.book_new();
            
            // Create a formatted title sheet
            const titleData = [
                ['WASPA EMPLOYEE SYSTEM - COMPREHENSIVE REPORT'],
                [''],
                ['Generated:', new Date().toLocaleString()],
                ['Generated By:', dataManager.getCurrentUser().email],
                ['User:', dataManager.getCurrentUser().name],
                [''],
                ['SUMMARY'],
                [`Total Tests: ${tests.length}`],
                [`Total Warnings: ${warnings.length}`],
                [`Report Period: ${this.getReportPeriod(tests, warnings)}`],
                [''],
                ['This report contains confidential information.'],
                ['Distribution is restricted to authorized personnel only.']
            ];
            
            const titleSheet = XLSX.utils.aoa_to_sheet(titleData);
            titleSheet['!cols'] = [{ wch: 40 }, { wch: 30 }];
            XLSX.utils.book_append_sheet(workbook, titleSheet, "Cover");

            // Add detailed sheets
            if (tests.length > 0) {
                const testsSheet = XLSX.utils.json_to_sheet(this.formatTestsForExport(tests));
                testsSheet['!cols'] = [
                    { wch: 12 }, { wch: 15 }, { wch: 10 }, 
                    { wch: 50 }, { wch: 15 }, { wch: 20 }, { wch: 20 }
                ];
                XLSX.utils.book_append_sheet(workbook, testsSheet, "Detailed Tests");
            }
            
            if (warnings.length > 0) {
                const warningsSheet = XLSX.utils.json_to_sheet(this.formatWarningsForExport(warnings));
                warningsSheet['!cols'] = [
                    { wch: 12 }, { wch: 20 }, { wch: 30 }, 
                    { wch: 15 }, { wch: 50 }, { wch: 50 }, 
                    { wch: 20 }, { wch: 20 }
                ];
                XLSX.utils.book_append_sheet(workbook, warningsSheet, "Detailed Warnings");
            }

            // Add analytics sheet
            const analyticsData = this.createAnalyticsData(tests, warnings);
            const analyticsSheet = XLSX.utils.json_to_sheet(analyticsData);
            analyticsSheet['!cols'] = [{ wch: 30 }, { wch: 20 }];
            XLSX.utils.book_append_sheet(workbook, analyticsSheet, "Analytics");

            XLSX.writeFile(workbook, `WASPA_Comprehensive_Report_${this.getCurrentDate()}.xlsx`);
            
            this.recordExport();
            this.showExportSuccess('Comprehensive report exported successfully!');
        } catch (error) {
            console.error('Error exporting formatted report:', error);
            this.showExportError('Failed to export formatted report. Please try again.');
        } finally {
            hideLoading();
        }
    }

    getReportPeriod(tests, warnings) {
        const allDates = [
            ...tests.map(t => new Date(t.date)),
            ...warnings.map(w => new Date(w.date))
        ].filter(date => !isNaN(date.getTime()));
        
        if (allDates.length === 0) return 'No data';
        
        const minDate = new Date(Math.min(...allDates));
        const maxDate = new Date(Math.max(...allDates));
        
        return `${minDate.toLocaleDateString()} to ${maxDate.toLocaleDateString()}`;
    }

    createAnalyticsData(tests, warnings) {
        // Monthly breakdown
        const monthlyStats = {};
        tests.forEach(test => {
            const month = new Date(test.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            if (!monthlyStats[month]) {
                monthlyStats[month] = { tests: 0, warnings: 0 };
            }
            monthlyStats[month].tests++;
        });
        
        warnings.forEach(warning => {
            const month = new Date(warning.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            if (!monthlyStats[month]) {
                monthlyStats[month] = { tests: 0, warnings: 0 };
            }
            monthlyStats[month].warnings++;
        });

        const analytics = [
            { 'Analytics Type': 'Value' },
            { 'PERFORMANCE METRICS': '' },
            { 'Total Records': tests.length + warnings.length },
            { 'Data Density (records/day)': this.calculateDataDensity(tests, warnings) },
            { '': '' },
            { 'COMPLIANCE OVERVIEW': '' }
        ];

        // Add monthly breakdown
        Object.entries(monthlyStats).forEach(([month, stats]) => {
            analytics.push({ [month]: `${stats.tests} tests, ${stats.warnings} warnings` });
        });

        analytics.push(
            { '': '' },
            { 'NETWORK PERFORMANCE': '' }
        );

        // Network statistics
        const networkStats = {};
        tests.forEach(test => {
            networkStats[test.network] = networkStats[test.network] || { total: 0, compliant: 0 };
            networkStats[test.network].total++;
            if (test.result === 'Compliant') {
                networkStats[test.network].compliant++;
            }
        });

        Object.entries(networkStats).forEach(([network, stats]) => {
            const complianceRate = ((stats.compliant / stats.total) * 100).toFixed(1);
            analytics.push({ [network]: `${stats.total} tests, ${complianceRate}% compliant` });
        });

        return analytics;
    }

    calculateDataDensity(tests, warnings) {
        const allDates = new Set([
            ...tests.map(t => t.date),
            ...warnings.map(w => w.date)
        ]);
        
        if (allDates.size === 0) return '0';
        
        const totalDays = allDates.size;
        const totalRecords = tests.length + warnings.length;
        
        return (totalRecords / totalDays).toFixed(2);
    }
}

// Initialize export manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ExportManager();
});
