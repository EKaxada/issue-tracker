// regex for date patterns
const dateRegex = new RegExp('^\\d\\d\\d\\d-\\d\\d-\\d\\d')
// reviver function to change all strings to dates
function jsonDateReviver(key,value){
  if(dateRegex.test(value)) return new Date(value);
  return value;
}

// utility function to handle all API calls nad report errors
async function graphQLFetch(query, variables={}){
  try {
    const response = await fetch('graphql', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ query, variables})
    })

    const body = await response.text();
    const result = JSON.parse(body, jsonDateReviver)

    // look for errors after response has been received
    if (result.errors) {
      const error = result.errors[0];
      if (error.extensions.code == 'BAD_USER_INPUT') {
        const details = error.extensions.exception.errors.join('\n ');
        alert(`${error.message}:\n ${details}`)
      } else {
        alert(`${error.extensions.code}: ${error.message}`)
      }
    }
    return result.data
  } catch(e) {
    alert(`Error in sending data to server: ${e.message}`)
  }
}

class IssueFilter extends React.Component {
  render() {
    return <div>This is a placeholder for the issue filter.</div>;
  }
}

function IssueRow(props) {
  const issue = props.issue;
  return (
    <tr>
      <td>{issue.id}</td>
      <td>{issue.status}</td>
      <td>{issue.owner}</td>
      <td>{issue.created.toDateString()}</td>
      <td>{issue.effort}</td>
      <td>{issue.due ? issue.due.toDateString():''}</td>
      <td>{issue.title}</td>
    </tr>
  );
}

function IssueTable(props) {
  const issueRows = props.issues.map((issue) => (
    <IssueRow key={issue.id} issue={issue} />
  ));

  return (
    <table className="bordered-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Status</th>
          <th>Owner</th>
          <th>Created</th>
          <th>Effort</th>
          <th>Due Date</th>
          <th>Title</th>
        </tr>
      </thead>
      <tbody>{issueRows}</tbody>
    </table>
  );
}

class IssueAdd extends React.Component {
  constructor() {
    super();
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleSubmit(e) {
    e.preventDefault();
    const form = document.forms.issueAdd;
    const issue = {
      owner: form.owner.value,
      title: form.title.value,
      due: new Date(new Date().getTime() + 1000*60*60*24*10)
    };
    this.props.createIssue(issue);
    form.owner.value = "";
    form.title.value = "";
  }

  render() {
    return (
      <form name="issueAdd" onSubmit={this.handleSubmit}>
        <input type="text" name="owner" placeholder="Owner" />
        <input type="text" name="title" placeholder="Title" />
        <button>Add</button>
      </form>
    );
  }
}

class IssueList extends React.Component {
  constructor() {
    super();
    this.state = { issues: [] };
    this.createIssue = this.createIssue.bind(this);
  }

  componentDidMount() {
    this.loadData();
  }

  async loadData() {
    // GraphQL query string
    const query = `query {
      issueList {
        id title status owner
        created effort due
      }
    }`;

    const data = await graphQLFetch(query);
    if (data) {
      this.setState({issues: data.issueList})
    }
  }

  async createIssue(issue) {
    // query field values filled in 
    const query = `mutation issueAdd($issue: IssueInputs!){
      issueAdd(issue: $issue){
        id
      }
    }`

    const data = await graphQLFetch(query, {issue});
    if (data) {
      this.loadData();
    }
  }

  render() {
    return (
      <React.Fragment>
        <h1>Issue Tracker</h1>
        <IssueFilter />
        <hr />
        <IssueTable issues={this.state.issues} />
        <hr />
        <IssueAdd createIssue={this.createIssue} />
      </React.Fragment>
    );
  }
}

const element = <IssueList />;

// Render the element in the contents div
ReactDOM.render(element, document.getElementById("contents"));
